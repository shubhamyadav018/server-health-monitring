from flask import Flask, request, jsonify, render_template
from pymongo import MongoClient
from bson import ObjectId
import datetime
import random
import time
import threading

app = Flask(__name__)

# MongoDB Setup
client = MongoClient("mongodb://localhost:27017/")
db = client["server_management"]
servers_collection = db["servers"]

# Utility Functions
def predict_server_failure(server):
    """Predict failure if CPU usage > 80%"""
    cpu_usage = server.get("metrics", {}).get("cpu_usage", 0)
    return cpu_usage > 80

def generate_maintenance_schedule():
    """Schedule maintenance 7 days from now"""
    return datetime.datetime.now() + datetime.timedelta(days=7)

# Routes
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/servers", methods=["GET"])
def get_servers():
    servers = list(servers_collection.find({}))
    for server in servers:
        server["_id"] = str(server["_id"])
    return jsonify(servers), 200

@app.route("/servers/<server_id>", methods=["GET"])
def get_server(server_id):
    try:
        obj_id = ObjectId(server_id)
    except Exception as e:
        return jsonify({"error": "Invalid server ID format"}), 400

    server = servers_collection.find_one({"_id": obj_id})
    if server:
        server["_id"] = str(server["_id"])
        return jsonify(server), 200
    else:
        return jsonify({"error": "Server not found"}), 404

@app.route("/servers", methods=["POST"])
def create_server():
    data = request.json
    result = servers_collection.insert_one(data)
    return jsonify({"_id": str(result.inserted_id)}), 201

@app.route("/servers/<server_id>", methods=["PUT"])
def update_server(server_id):
    try:
        obj_id = ObjectId(server_id)
    except Exception as e:
        return jsonify({"error": "Invalid server ID format"}), 400

    data = request.json
    result = servers_collection.update_one({"_id": obj_id}, {"$set": data})
    if result.modified_count > 0:
        return jsonify({"message": "Server updated successfully"}), 200
    else:
        return jsonify({"error": "Server not found or no changes made"}), 404

@app.route("/servers/<server_id>", methods=["DELETE"])
def delete_server(server_id):
    try:
        obj_id = ObjectId(server_id)
    except Exception as e:
        return jsonify({"error": "Invalid server ID format"}), 400

    result = servers_collection.delete_one({"_id": obj_id})
    if result.deleted_count > 0:
        return jsonify({"message": "Server deleted successfully"}), 200
    else:
        return jsonify({"error": "Server not found"}), 404

@app.route("/predict_server_failure/<server_id>", methods=["GET"])
def predict_failure_endpoint(server_id):
    try:
        obj_id = ObjectId(server_id)
    except Exception as e:
        return jsonify({"error": "Invalid server ID format"}), 400

    server = servers_collection.find_one({"_id": obj_id})
    if not server:
        return jsonify({"error": "Server not found"}), 404

    is_failure = predict_server_failure(server)
    return jsonify({"server_id": server_id, "is_likely_to_fail": is_failure}), 200

@app.route("/generate_maintenance_schedule/<server_id>", methods=["GET"])
def maintenance_schedule_endpoint(server_id):
    try:
        obj_id = ObjectId(server_id)
    except Exception as e:
        return jsonify({"error": "Invalid server ID format"}), 400

    server = servers_collection.find_one({"_id": obj_id})
    if not server:
        return jsonify({"error": "Server not found"}), 404

    schedule_date = generate_maintenance_schedule()
    return jsonify({"server_id": server_id, "maintenance_date": schedule_date.isoformat()}), 200

@app.route("/server_history/<server_id>", methods=["GET"])
def get_server_history(server_id):
    """
    Simulate historical CPU usage data based on the current value.
    Returns 10 data points with time labels.
    """
    try:
        obj_id = ObjectId(server_id)
    except Exception as e:
        return jsonify({"error": "Invalid server ID format"}), 400

    server = servers_collection.find_one({"_id": obj_id})
    if not server:
        return jsonify({"error": "Server not found"}), 404

    current_cpu = server.get("metrics", {}).get("cpu_usage", 0)
    # Simulate 10 data points with random variations around the current value.
    history = [max(0, min(100, current_cpu + random.randint(-10, 10))) for _ in range(10)]
    now = datetime.datetime.now()
    # Create time labels for each data point (e.g., last 10 minutes)
    labels = [(now - datetime.timedelta(minutes=10 - i)).strftime("%H:%M") for i in range(10)]
    return jsonify({"labels": labels, "data": history}), 200

def simulate_metrics():
    """Background thread to update CPU and memory usage randomly every 5 seconds."""
    while True:
        time.sleep(5)
        servers = list(servers_collection.find({}))
        for server in servers:
            new_cpu = random.randint(0, 100)
            new_memory = random.randint(0, 100)
            servers_collection.update_one(
                {"_id": server["_id"]},
                {"$set": {"metrics.cpu_usage": new_cpu, "metrics.memory_usage": new_memory}}
            )
            print(f"Updated server '{server.get('name', 'Unnamed')}' with CPU: {new_cpu}% and Memory: {new_memory}%")

if __name__ == "__main__":
    # Start background thread to simulate metric updates
    thread = threading.Thread(target=simulate_metrics, daemon=True)
    thread.start()
    app.run(debug=True)
