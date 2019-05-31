from flask import Flask, request, Response
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util, ObjectId
from datetime import datetime
import json
import os

database_uri = "localhost"
port = 5000

if "DATABASE_URI" in os.environ:
    database_uri = os.environ["DATABASE_URI"]
if "PORT" in os.environ:
    port = os.environ["PORT"]

client = MongoClient(database_uri, 27017)
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
    l = db.users.find_one_and_update({"id": iden}, {"$set":{"id": iden, "name": name}}, upsert=True, projection={"_id":1})
    return jsonify(l)

@app.route("/api/get_user_id", methods=['POST'])
def get_user_id():
    content = request.json
    iden = content["id"]
    return jsonify(db.users.find_one({"id": iden}))


@app.route("/api/articles", methods=['GET'])
def articles():
    return jsonify(list(db.articles.find(limit=12, sort=[("published_date", -1)])))

@app.route("/api/read", methods=['POST'])
def read():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    article_id = ObjectId(content["article_id"]["$oid"])
    print(user_id, article_id)
    db.users.update_one({"_id": user_id, "read.article_id": {"$ne": article_id}}, {"$push": {"read":{"article_id": article_id, "time": datetime.now()}}})
    return jsonify({})

@app.route("/api/all_articles", methods=['POST'])
def all_articles():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    all_read = db.users.find_one({"_id": user_id})["read"]
    t = {}
    all_read2 = []
    for x in all_read:
        all_read2.append(x["article_id"])
        t[x["article_id"]] = x["time"]
    articles = list(db.articles.find({"_id":{"$in": all_read2}}))
    for x in articles:
        x["access_time"] = t[x["_id"]]
    return jsonify(articles)




if __name__ == "__main__":
   app.run(host="0.0.0.0", port=port)