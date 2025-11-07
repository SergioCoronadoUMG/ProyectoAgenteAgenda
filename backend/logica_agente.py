import json, os, re
from datetime import datetime, timedelta

FMT = "%Y-%m-%d %H:%M"
def dt(date_str, time_str): return datetime.strptime(f"{date_str} {time_str}", FMT)

class AgenteAgenda:
    def __init__(self):
        base = os.path.dirname(os.path.abspath(__file__))
        self.archivo = os.path.join(base, "datos.json")
        self.tareas = self.cargar_tareas()
        self._recontar_ids()

    # ------------------ IO ------------------
    def cargar_tareas(self):
        if not os.path.exists(self.archivo): return []
        try:
            with open(self.archivo, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def guardar(self):
        with open(self.archivo, "w", encoding="utf-8") as f:
            json.dump(self.tareas, f, ensure_ascii=False, indent=2)

    def _recontar_ids(self):
        max_id = 0
        for t in self.tareas:
            if "id" not in t:
                max_id += 1
                t["id"] = max_id
            else:
                max_id = max(max_id, int(t["id"]))
        self._next_id = max_id + 1

    def _nuevo_id(self):
        nid = self._next_id
        self._next_id += 1
        return nid

    # ------------------ CRUD ------------------
    def listar_tareas(self):
        return sorted(self.tareas, key=lambda x: (x["fecha"], x["hora"]))

    def _evento_existente(self, nombre, fecha, hora):
        nom = (nombre or "").strip().lower()
        for t in self.tareas:
            if t["fecha"] == fecha and t["hora"] == hora and t["nombre"].strip().lower() == nom:
                return True
        return False

    def agregar_tarea(self, nombre, fecha, hora, duracion=30, prioridad=3):
        if not fecha or not hora:
            raise ValueError("Fecha u hora no válidas para crear tarea")
        tarea = {
            "id": self._nuevo_id(),
            "nombre": nombre or "Sin título",
            "fecha": fecha,
            "hora": hora,
            "duracion": int(duracion),
            "prioridad": int(prioridad),
            "estado": "Programada",
            "bitacora": []
        }
        self.tareas.append(tarea)
        self.guardar()
        return tarea

    def _buscar(self, tarea_id):
        for t in self.tareas:
            if int(t["id"]) == int(tarea_id):
                return t
        raise ValueError("Tarea no encontrada")

    def editar_tarea(self, tarea_id, **kwargs):
        t = self._buscar(tarea_id)
        for k, v in kwargs.items():
            if v is not None and k in t:
                t[k] = v
        t["bitacora"].append({"ts": datetime.now().isoformat(), "accion": "editar"})
        self.guardar()
        return t

    def eliminar_tarea(self, tarea_id):
        before = len(self.tareas)
        self.tareas = [t for t in self.tareas if int(t["id"]) != int(tarea_id)]
        if len(self.tareas) == before:
            raise ValueError("Tarea no encontrada")
        self.guardar()

    # ------------------ CONFLICTOS ------------------
    def _intervalo(self, t):
        inicio = dt(t["fecha"], t["hora"])
        fin = inicio + timedelta(minutes=int(t["duracion"]))
        return inicio, fin

    def _solapan(self, a, b):
        ia, fa = self._intervalo(a)
        ib, fb = self._intervalo(b)
        return ia < fb and ib < fa

    def detectar_conflictos(self):
        conflictos, orden = [], self.listar_tareas()
        for i in range(len(orden)):
            for j in range(i + 1, len(orden)):
                if self._solapan(orden[i], orden[j]):
                    conflictos.append({"a": orden[i]["id"], "b": orden[j]["id"]})
        return {"conflictos": conflictos, "total": len(conflictos)}

    # ------------------ NLP principal ------------------
    def interpretar_comando(self, texto: str):
        try:
            texto = texto.strip().lower()

            # Ayuda
            if re.search(r"\b(hola|ayuda|comandos|qué puedes hacer)\b", texto):
                return self._ayuda()

            # Crear reunión
            if re.search(r"(crear|agendar|programa(r)?|pon(e)? una cita|reunión)", texto):
                parsed = self._parse_crear(texto)
                if not parsed["ok"]:
                    return {"accion": "ayuda", "ayuda": self._ayuda()["ayuda"]}
                nombre, fecha, hora, duracion, prioridad = (
                    parsed["nombre"],
                    parsed["fecha"],
                    parsed["hora"],
                    parsed["duracion"],
                    parsed["prioridad"],
                )
                if self._evento_existente(nombre, fecha, hora):
                    return {"accion": "crear", "duplicado": True, "tarea": {"nombre": nombre, "fecha": fecha, "hora": hora}}
                tarea = self.agregar_tarea(nombre, fecha, hora, duracion, prioridad)
                return {"accion": "crear", "tarea": tarea, "conflictos": self.detectar_conflictos()}

            # Editar
            m = re.search(r"(editar|mueve)\s+(\d+).*(hoy|mañana|\d{4}-\d{2}-\d{2}).*?(\d{1,2}:\d{2})", texto)
            if m:
                tarea_id = int(m.group(2))
                fecha = self._resolver_fecha_kw(m.group(3))
                hora = m.group(4)
                t = self.editar_tarea(tarea_id, fecha=fecha, hora=hora)
                return {"accion": "editar", "ok": True, "tarea": t}

            # Eliminar
            m = re.search(r"(elimina(r)?|borra(r)?)\s+(\d+)", texto)
            if m:
                tarea_id = int(m.group(4))
                self.eliminar_tarea(tarea_id)
                return {"accion": "eliminar", "ok": True, "tarea_id": tarea_id}

            # Pendientes
            if re.search(r"pendiente(s)?|qué tengo|mis tareas", texto):
                return {"accion": "listar_pendientes", "datos": self.obtener_pendientes()}

            # Conflictos
            if re.search(r"conflicto(s)?|choque(s)?|se cruza(n)?", texto):
                return {"accion": "conflictos", **self.detectar_conflictos()}

            return self._ayuda()

        except Exception as e:
            # Atrapa cualquier excepción para evitar error 500
            return {"accion": "error", "mensaje": f"Error: {str(e)}"}

    # ------------------ NLP Helper: parsear creación ------------------
    def _parse_crear(self, texto):
        faltan = []
        fecha_str = None
        m_fecha = re.search(r"(hoy|mañana|\d{1,2}(?:[/-]\d{1,2})?(?:[/-]\d{2,4})?)", texto)
        if m_fecha:
            fecha_str = self._resolver_fecha_kw(m_fecha.group(1))
        else:
            faltan.append("fecha")

        hora = None
        m_hora = re.search(r"\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?\b", texto)
        if m_hora:
            h = int(m_hora.group(1))
            m = int(m_hora.group(2) or 0)
            suf = (m_hora.group(3) or "").lower()
            if suf == "pm" and h < 12:
                h += 12
            if suf == "am" and h == 12:
                h = 0
            hora = f"{h:02d}:{m:02d}"
        else:
            faltan.append("hora")

        duracion = 30
        m_dur = re.search(r"(\d+)\s*(min|minutos|hora|horas)", texto)
        if m_dur:
            val = int(m_dur.group(1))
            if "hora" in m_dur.group(2):
                val *= 60
            duracion = val
        elif "una hora" in texto:
            duracion = 60

        prioridad = 3
        m_prio = re.search(r"prioridad\s*(\d)", texto)
        if m_prio:
            prioridad = int(m_prio.group(1))

        m_nombre = re.search(r"(nombre|para|sobre|asunto)\s+(.+)", texto)
        nombre = (m_nombre.group(2).strip().capitalize() if m_nombre else "Reunión")

        ok = fecha_str is not None and hora is not None
        return {
            "ok": ok,
            "faltan": faltan,
            "fecha": fecha_str,
            "hora": hora,
            "duracion": duracion,
            "prioridad": prioridad,
            "nombre": nombre,
        }

    def _ayuda(self):
        return {
            "accion": "ayuda",
            "ayuda": [
                "crear reunión <fecha> <hora> por <min> min nombre <texto>",
                "ej: agendar el 8 a las 11:30 por 60 minutos nombre Revisión",
                "editar <id> a <YYYY-MM-DD> <HH:MM>",
                "eliminar <id>",
                "pendientes",
                "conflictos",
                "ayuda",
            ],
        }

    # ------------------ FECHAS ------------------
    def _resolver_fecha_kw(self, kw):
        hoy = datetime.now().date()
        kw = kw.replace("/", "-")
        if kw == "hoy":
            return hoy.strftime("%Y-%m-%d")
        if kw == "mañana":
            return (hoy + timedelta(days=1)).strftime("%Y-%m-%d")

        if re.match(r"^\d{4}-\d{2}-\d{2}$", kw):
            return kw
        m = re.match(r"^(\d{1,2})(?:-(\d{1,2}))?(?:-(\d{2,4}))?$", kw)
        if m:
            d = int(m.group(1))
            mth = int(m.group(2)) if m.group(2) else hoy.month
            yr = int(m.group(3)) if m.group(3) else hoy.year
            try:
                return datetime(yr, mth, d).strftime("%Y-%m-%d")
            except Exception:
                return hoy.strftime("%Y-%m-%d")
        return hoy.strftime("%Y-%m-%d")

    def obtener_pendientes(self):
        hoy = datetime.now().strftime("%Y-%m-%d")
        return [t for t in self.tareas if t["fecha"] >= hoy]
