from flask import Flask, request, Response
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util
import json

client = MongoClient()
db = client["burstMyBubble"]
app = Flask(__name__)
CORS(app)

def jsonify(obj):
    content = json.dumps(obj, default=json_util.default)
    return Response(content, 200, mimetype="application/json")

@app.route("/api/register_user", methods=['POST'])
def register_user():
    content = request.json
    iden = content["id"]
    name = content["name"]
    db.users.update({"id": iden}, {"id": iden, "name": name}, upsert=True)
    return jsonify({})

@app.route("/api/articles", methods=['GET'])
def articles():
    return jsonify(list(db.articles.find(limit=12, sort=[("published_date", -1)])))