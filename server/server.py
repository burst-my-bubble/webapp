from flask import Flask, request, Response
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util, ObjectId
from datetime import datetime
import json
import os
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

database_uri = "localhost"
port = 5000

if "DATABASE_URI" in os.environ:
    database_uri = os.environ["DATABASE_URI"]
if "PORT" in os.environ:
    port = os.environ["PORT"]
if "SENTRY_URI" in os.environ:
    sentry_sdk.init(
        dsn=os.environ["SENTRY_URI"],
        integrations=[FlaskIntegration()]
    )

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
    skip = request.args.get("skip")
    if skip == None:
        skip = 0
    else:
        try:
            skip = int(skip)
        except:
            skip = 0
    displayedArticles = list(db.articles.find(limit=12, sort=[("published_date", -1)], skip=skip))
    #allEntities = list(db.entities.find({"score": {"$gt": 3 }}))
    addMetadata(displayedArticles)

    return jsonify(displayedArticles)

def addMetadata(articles):
    for article in articles:
            entities = list(map(lambda x: x["name"], article["entities"]))
            entities = db.entities.find({"name": {"$in" : entities}, "score": {"$gt": 2}, "bl": False}, sort=[("score", -1)], limit=5)
            entities = list(entities)
            article["entities"] = entities

@app.route("/api/categories", methods=['GET'])
def categories():
    return jsonify(list(db.categories.find()))

@app.route("/api/articles/<category>", methods=['GET'])
def articlesByCategory(category):
    skip = request.args.get("skip")
    if skip == None:
        skip = 0
    else:
        try:
            skip = int(skip)
        except:
            skip = 0
    c = db.categories.find_one({"slug": category})
    if c is None:
        return jsonify([])
    else:
        feeds = db.feeds.find({"category_id": c["_id"]}, projection= {"_id": 1})
        feeds = list(map(lambda x: x["_id"], feeds))
        displayedArticles = list(db.articles.find({"feed_id": {"$in": feeds}}, limit=12, sort=[("published_date", -1)], skip=skip))
        addMetadata(displayedArticles)
        return displayedArticles

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