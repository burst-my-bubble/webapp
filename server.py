from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from pymongo import MongoClient

client = MongoClient()
db = client["burstMyBubble"]
app = Flask(__name__)
CORS(app)

@app.route('/api/register_user', methods=['POST'])
def register_user():
    content = request.json
    iden = content["id"]
    name = content["name"]
    db.users.update({"id": iden}, {"id": iden, "name": name}, upsert=True)
    return "OK"
