from flask import Flask, request, Response
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util, ObjectId
from datetime import datetime
import dateutil.parser
import json
import os
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration
import facebook

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

def get_new_mean(avg, new_value, total):
    return (avg * total + new_value) / (total + 1)

#Gets a list of article ids of the user's history
def get_user_article_history(user_id):
    user = db.users.find_one({"_id": user_id})
    if (user.get("read") is None):
        user["read"] = []
    return list(map(lambda x: x["article_id"], user["read"]))


#Choice can be "categories" or "entities", returning the history stats for that choice.
def gen_category_stats(history):
    chosenList = dict()
    for article in history:
        sentiment = article["sentiment"]
        bias = 0.5 #article["sourceBias"]
        cat = getArticleCategory(article)
        name = cat
        if name in chosenList:
            (count, avgSentiment, avgBias) = chosenList[name]
            chosenList[name] = (count + 1, get_new_mean(avgSentiment, sentiment, count), get_new_mean(avgBias, bias, count))
        else:
            chosenList[name] = (1, sentiment, bias)
    return chosenList

def get_blacklisted_entities():
    return list(db.entities.find({"bl": True}))

#Choice can be "categories" or "entities", returning the history stats for that choice.
def gen_entity_stats(history):
    chosenList = dict()
    blacklist = map(lambda x: x["name"], get_blacklisted_entities())
    for article in history:
        sentiment = article["sentiment"]
        bias = 0.5 #article["sourceBias"]
        for field in article["entities"]:
            name = field["name"]
            if name in chosenList and not name in blacklist:
                (count, avgSentiment, avgBias) = chosenList[name]
                chosenList[name] = (count + 1, get_new_mean(avgSentiment, sentiment, count), get_new_mean(avgBias, bias, count))
            else:
                chosenList[name] = (1, sentiment, bias)
    return chosenList

#Gets the category of an article
def getArticleCategory(article):
    category_id = db.feeds.find_one({"_id": article["feed_id"]})["category_id"]
    return db.categories.find_one({"_id": category_id})["slug"]

#Gets number of hours between article's publishing and now
def getDecayScore(article):
    article_datetime = article["published_date"]
    if article_datetime is None:
        return 0
    now = datetime.now()
    
    duration = now - article_datetime
    hours = duration.total_seconds() / 3600
    return 30 - int(hours)

#Given an article and the history stats of that user, scores the article.
def gen_article_score(article, entityStats, categoryStats):
    score = 0
    for entity in article["entities"]:
        name = entity["name"]
        if name in entityStats: #not taking into account any count, sentiment, bias yet
            score = score + 10

    name = getArticleCategory(article)
    if name in categoryStats: #not taking into account any count, sentiment, bias yet
        score = score + 50

    score = score + getDecayScore(article)
    return score

def sortByScore(val):
    return val["score"]

def get_best_matching_articles(user_id, skip, category_id):
    recent_read = get_user_article_history(user_id)[-120:]
    history = list(db.articles.find({"_id":{"$in": recent_read}}))
    entity_scores = gen_entity_stats(history)
    category_scores = gen_category_stats(history)
    print("entity_scores:",entity_scores)
    print("category_scores:", category_scores)
    if category_id is None:
        all_articles = list(db.articles.find(limit=120, sort=[("published_date", -1)]))
    else:
        feeds = db.feeds.find({"category_id": category_id["_id"]}, projection= {"_id": 1})
        feeds = list(map(lambda x: x["_id"], feeds))
        all_articles = list(db.articles.find({"feed_id": {"$in": feeds}}, limit=120, sort=[("published_date", -1)]))
    for article in all_articles:
        article["score"] = gen_article_score(article, entity_scores, category_scores)

    all_articles.sort(key = sortByScore)
    return all_articles[skip: skip+12]

def pick(a, prop):
    return [x[prop] for x in a]

@app.route("/api/register_user", methods=['POST'])
def register_user():
    content = request.json
    print(content)
    access_token = content["access_token"]
    graph = facebook.GraphAPI(access_token=access_token, version="3.1")
    user = graph.get_object("me")
    iden = user["id"]
    name = user["name"]
    ids = pick(graph.get_object("me/friends")["data"], "id")
    friends = list(db.users.find({"id": {"$in": ids}}, projection={"_id":1}))
    friends = pick(friends, "_id")
    l = db.users.find_one_and_update({"id": iden}, 
        {"$set":{"id": iden, "name": name, "friends": friends}}, 
        upsert=True, projection={"_id":1})
    
    return jsonify(l)

@app.route("/api/get_user_id", methods=['POST'])
def get_user_id():
    content = request.json
    iden = content["id"]
    return jsonify(db.users.find_one({"id": iden}))


@app.route("/api/articles", methods=['POST'])
def articles():
    skip = request.args.get("skip")
    if skip == None:
        skip = 0
    else:
        try:
            skip = int(skip)
        except:
            skip = 0
    content = request.json
    user_id = ObjectId(content["user_id"]["$oid"])

    displayedArticles = get_best_matching_articles(user_id, skip, None) 
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

@app.route("/api/articles/<category>", methods=['POST'])
def articlesByCategory(category):
    skip = request.args.get("skip")
    content = request.json
    user_id = ObjectId(content["user_id"]["$oid"])
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
        displayedArticles = get_best_matching_articles(user_id, skip, c)
        addMetadata(displayedArticles)
        return jsonify(displayedArticles)

@app.route("/api/read", methods=['POST'])
def read():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    article_id = ObjectId(content["article_id"]["$oid"])
    print(user_id, article_id)
    db.users.update_one({"_id": user_id, "read.article_id": {"$ne": article_id}}, {"$push": {"read":{"article_id": article_id, "time": datetime.now()}}})
    return jsonify({})

@app.route("/api/friends", methods=['POST'])
def friends():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    ids = db.users.find_one({"_id": user_id})["friends"]
    return jsonify(list(db.users.find({"_id": {"$in": ids}}, 
        projection={"_id": 1, "id": 1, "name": 1})))


@app.route("/api/all_articles", methods=['POST'])
def all_articles():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    user = db.users.find_one({"_id": user_id})
    if (user.get("read") is None):
        user["read"] = []
    all_read = user["read"]
    t = {}
    all_read2 = []
    for x in all_read:
        all_read2.append(x["article_id"])
        t[x["article_id"]] = x["time"]
    articles = list(db.articles.find({"_id":{"$in": all_read2}}))
    for x in articles:
        x["access_time"] = t[x["_id"]]
    return jsonify(articles)

@app.route("/api/categories", methods=['POST'])
def meta_categories():
    content = request.json
    user_id = ObjectId(content["user_id"]["$oid"])
    print(user_id)
    all_read = list(map(lambda x: x["article_id"], db.users.find_one({"_id": user_id})["read"]))

    return jsonify(list(db.articles.aggregate([{
        "$match": {
            "_id": {
                "$in": all_read
            }
        } }, {
            "$group": {
                "_id": "$feed_id",
                "count": {
                    "$sum": 1
                }
            }
        }, {
            "$lookup": {
                "from": "feeds",
                "localField": "_id",
                "foreignField": "_id",
                "as": "category_id"
            }
        }, {
            "$project": {
                "_id": 1,
                "count": 1,
                "category_id": {
                    "$arrayElemAt": ["$category_id.category_id", 0]
                }
            }
        }, {
            "$group": {
                "_id": "$category_id",
                "count": {
                    "$sum": "$count"
                }
            }
        }, {
            "$lookup": {
                "from": "categories",
                "localField": "_id",
                "foreignField": "_id",
                "as": "category_id"
            }
        }, {
            "$project": {
                "_id": 1,
                "count": 1,
                "title": {
                    "$arrayElemAt": ["$category_id.title", 0]
                }
            }
        }])))

@app.route("/api/sources", methods=['POST'])
def meta_sources():
    content = request.json
    user_id = ObjectId(content["user_id"]["$oid"])
    print(user_id)
    all_read = list(map(lambda x: x["article_id"], db.users.find_one({"_id": user_id})["read"]))
    return jsonify(list(db.articles.aggregate([{
        "$match": {
            "_id": {
                "$in": all_read
            }
        }
    }, {
        "$group": {
            "_id": "$feed_id",
            "count": {
                "$sum": 1
            }
        }
    }, {
        "$lookup": {
            "from": "feeds",
            "localField": "_id",
            "foreignField": "_id",
            "as": "source_id"
        }
    }, {
        "$project": {
            "_id": 1,
            "count": 1,
            "source_id": {
                "$arrayElemAt": ["$source_id.source_id", 0]
            }
        }
    }, {
        "$group": {
            "_id": "$source_id",
            "count": {
                "$sum": "$count"
            }
        }
    }, {
        "$lookup": {
            "from": "sources",
            "localField": "_id",
            "foreignField": "_id",
            "as": "source_id"
        }
    }, {
        "$project": {
            "_id": 1,
            "count": 1,
            "title": {
                "$arrayElemAt": ["$source_id.title", 0]
            }
        }
    }])))

if __name__ == "__main__":
   app.run(host="0.0.0.0", port=port)