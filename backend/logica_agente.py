import json
import os
from datetime import datetime

class AgenteAgenda:
    def __init__(self):
        # Crea una ruta absoluta hacia el archivo datos.json
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.archivo = os.path.join(base_dir, "datos.json")
        self.tareas = self.cargar_tareas()

    # ===============================
    # UTILIDADES
    # ===============================
    def cargar_tareas(self):
        try:
            with open(self.archivo, "r", encoding="utf-8") as f:
                return json.load(f)
        except FileNotFoundError:
            return []

    def guardar_tareas(self):
        with open(self.archivo, "w", encoding="utf-8") as f:
            json.dump(self.tareas, f, indent=4, ensure_ascii=False)

    # ===============================
    # CRUD DE TAREAS
    # ===============================
    def agregar_tarea(self, nombre, hora, prioridad, fecha, duracion):
        nueva_tarea = {
            "nombre": nombre,
            "hora": hora,
            "prioridad": prioridad,
            "fecha": fecha,
            "duracion": duracion,
            "estado": "Programada",
            "bitacora": []
        }
        self.tareas.append(nueva_tarea)
        self.guardar_tareas()

    def listar_tareas(self):
        return sorted(
            self.tareas,
            key=lambda x: (x["fecha"], x["hora"], -int(x["prioridad"]))
        )

    def sugerir_horarios(self):
        if not self.tareas:
            return "No tienes tareas registradas aún."
        resumen = []
        for t in self.tareas:
            resumen.append(
                f"{t['fecha']} - {t['nombre']} ({t['estado']}, prioridad {t['prioridad']})"
            )
        return "\n".join(resumen)

    # ===============================
    # GESTIÓN DE ESTADOS / CHATBOT
    # ===============================
    def cambiar_estado(self, nombre, nuevo_estado, comentario=None):
        for t in self.tareas:
            if t["nombre"].lower() == nombre.lower():
                t["estado"] = nuevo_estado
                registro = {
                    "fecha": datetime.now().strftime("%Y-%m-%d %H:%M"),
                    "accion": nuevo_estado,
                    "comentario": comentario or "Sin comentario"
                }
                t["bitacora"].append(registro)
                self.guardar_tareas()
                return t
        return None

    def resumen_estados(self):
        resumen = {"Programada": 0, "En proceso": 0, "Realizada": 0, "Reprogramar": 0}
        for t in self.tareas:
            estado = t.get("estado", "Programada")
            if estado in resumen:
                resumen[estado] += 1
            else:
                resumen[estado] = 1
        return resumen

    def obtener_pendientes(self):
        hoy = datetime.now().strftime("%Y-%m-%d")
        pendientes = [
            t for t in self.tareas
            if t["fecha"] <= hoy and t["estado"] in ["Programada", "En proceso"]
        ]
        return pendientes
