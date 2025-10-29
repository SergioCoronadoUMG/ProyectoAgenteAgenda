from flask import Flask, jsonify, request
from flask_cors import CORS
from logica_agente import AgenteAgenda

app = Flask(__name__)
CORS(app)

agente = AgenteAgenda()

@app.route("/tareas", methods=["GET"])
def listar_tareas():
    return jsonify(agente.listar_tareas())

@app.route("/tareas", methods=["POST"])
def agregar_tarea():
    data = request.get_json()
    nombre = data.get("nombre")
    hora = data.get("hora")
    prioridad = data.get("prioridad")
    fecha = data.get("fecha")
    duracion = data.get("duracion")
    agente.agregar_tarea(nombre, hora, prioridad, fecha, duracion)
    return jsonify({"mensaje": "Tarea agregada correctamente"})

@app.route("/sugerencias", methods=["GET"])
def sugerencias():
    return agente.sugerir_horarios()

if __name__ == "__main__":
    app.run(debug=True)
