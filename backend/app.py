# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
from logica_agente import AgenteAgenda

app = Flask(__name__)
CORS(app)
agente = AgenteAgenda()

# ---------- TAREAS ----------
@app.route("/tareas", methods=["GET"])
def listar_tareas():
    return jsonify(agente.listar_tareas())

@app.route("/tareas", methods=["POST"])
def agregar_tarea():
    data = request.get_json(force=True)
    tarea = agente.agregar_tarea(
        nombre=data.get("nombre"),
        fecha=data.get("fecha"),
        hora=data.get("hora"),
        duracion=int(data.get("duracion", 30)),
        prioridad=int(data.get("prioridad", 3)),
    )
    return jsonify({"mensaje": "Tarea agregada", "tarea": tarea})

@app.route("/tareas/<int:tarea_id>", methods=["PUT"])
def editar_tarea(tarea_id):
    data = request.get_json(force=True)
    tarea = agente.editar_tarea(
        tarea_id,
        nombre=data.get("nombre"),
        fecha=data.get("fecha"),
        hora=data.get("hora"),
        duracion=int(data.get("duracion", 30)) if data.get("duracion") else None,
        prioridad=int(data.get("prioridad", 3)) if data.get("prioridad") else None,
        estado=data.get("estado"),
    )
    return jsonify({"mensaje": "Tarea actualizada", "tarea": tarea})

@app.route("/tareas/<int:tarea_id>", methods=["DELETE"])
def eliminar_tarea(tarea_id):
    agente.eliminar_tarea(tarea_id)
    return jsonify({"mensaje": "Tarea eliminada"})

# ---------- CONFLICTOS / SUGERENCIAS ----------
@app.route("/conflictos", methods=["GET"])
def conflictos():
    return jsonify(agente.detectar_conflictos())

@app.route("/sugerencias", methods=["GET"])
def sugerencias():
    return jsonify(agente.sugerir_horarios())

@app.route("/reprogramar/<int:tarea_id>", methods=["GET"])
def reprogramar(tarea_id):
    return jsonify(agente.sugerencias_para_tarea(tarea_id))

# ---------- NLP ----------
@app.route("/nlu", methods=["POST"])
def nlu():
    data = request.get_json(force=True)
    texto = data.get("texto", "")
    return jsonify(agente.interpretar_comando(texto))

if __name__ == "__main__":
    app.run(debug=True)
