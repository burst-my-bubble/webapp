from flask import Flask, request, Response
from flask_cors import CORS
from pymongo import MongoClient
from bson import json_util, ObjectId
from datetime import datetime, timedelta
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
def gen_category_stats(cat_details):
    chosenList = dict()
    for detail in cat_details:
        sentiment = detail["sentiment"]
        bias = 0.5 #article["sourceBias"]
        name = detail["cat_name"]
        if name in chosenList:
            (count, avgSentiment, avgBias) = chosenList[name]
            chosenList[name] = (count + 1, get_new_mean(avgSentiment, sentiment, count), get_new_mean(avgBias, bias, count))
        else:
            chosenList[name] = (1, sentiment, bias)
    return chosenList

def get_blacklisted_entities():
    return list(db.entities.find({"bl": True}))

#Choice can be "categories" or "entities", returning the history stats for that choice.
def gen_entity_stats(entity_details):
    chosenList = dict()
    blacklist = map(lambda x: x.get('name', None), get_blacklisted_entities())
    for detail in entity_details:
        sentiment = detail["sentiment"]
        bias = 0.5 #article["sourceBias"]
        for name in detail["entity_name"]:
            if name in chosenList and not name in blacklist:
                (count, avgSentiment, avgBias) = chosenList[name]
                chosenList[name] = (count + 1, get_new_mean(avgSentiment, sentiment, count), get_new_mean(avgBias, bias, count))
            else:
                chosenList[name] = (1, sentiment, bias)
    return chosenList

#Gets number of hours between article's publishing and now
def getDecayScore(article):
    article_datetime = article["published_date"]
    if article_datetime is None:
        return 0
    now = datetime.now()
    
    duration = now - article_datetime
    hours = duration.total_seconds() / 3600
    return 30 - int(hours)

    #Gets the category of an article
def getArticleCategory(article):
    category_id = db.feeds.find_one({"_id": article["feed_id"]})["category_id"]
    return db.categories.find_one({"_id": category_id})["slug"]


#Given an article and the history stats of that user, scores the article.
#Stats are of the form (count, avgSentiment, avgEntities)
def gen_article_score(article, entityStats, categoryStats, is_in_history):
    score = 0
    for entity in article["entities"]:
        name = entity["name"]
        if name in entityStats: #not taking into account any count, sentiment, bias yet
            #Increments score by the amount of times that entity is in user's history
            score = score + entityStats[name][0] * 10

    name = getArticleCategory(article)
    if name in categoryStats: #not taking into account any count, sentiment, bias yet
        score = score + categoryStats[name][0] * 10
    
    if is_in_history:
        score = score - 50

    score = score + getDecayScore(article)
    return score

def sortByScore(val):
    return -val["score"]

def get_articles_given_entity(entity, skip):
    return list(db.articles.find({"entities.name": entity["name"]}))[skip: skip+12]

def get_trending_entities():
    return list(db.entities.find({"bl": False}, {"name": 1, "score": 1}).sort([("score", -1)]).limit(20))

def get_best_matching_articles(user_id, skip, category_id):
    #Up to incl. line 127 gets recently read articles by user
    #Entity stats contains just entity names and sentiments of each articles
    #Category stats contains list of the category name and the article's sentiment
    stats = list(db.users.aggregate([{"$match": {"_id": user_id}}, 
        {"$project": {"read": 1}}, {"$unwind": "$read"}, 
        {"$project": {"_id": "$read.article_id", "access_time": "$read.time"}},
        {"$sort": {"access_time": -1}},
        {"$limit": 120},
        {"$lookup": {"from": "articles", "localField": "_id", "foreignField": "_id", "as": "info"}},
        {"$facet": {"entity_stats": [
            {"$project": {"sentiment": {"$arrayElemAt": ["$info.sentiment", 0]},
                            "entity_name": {"$arrayElemAt": ["$info.entities.name", 0]}, "_id": 0
                            }},
        ], "category_stats": [
            {"$project": {"sentiment": {"$arrayElemAt": ["$info.sentiment", 0]},
                            "feed_id": {"$arrayElemAt": ["$info.feed_id", 0]}, "_id": 0}},
            {"$lookup": {"from": "feeds", "localField": "feed_id", "foreignField": "_id", "as": "feed_info"}},
            {"$project": {"cat_id": {"$arrayElemAt": ["$feed_info.category_id", 0]}, "sentiment": 1 }},
            {"$lookup": {"from": "categories", "localField": "cat_id", "foreignField": "_id", "as": "cat_info"}},
            {"$project": {"sentiment": 1, "cat_name": {"$arrayElemAt": ["$cat_info.slug", 0]}}}
        ], "history": [
            {"$project":{"_id": {"$arrayElemAt": ["$info._id", 0]}}}]}}]))
    recent_read = get_user_article_history(user_id)[-120:]
    history = stats[0]["history"]
    entity_scores = gen_entity_stats(stats[0]["entity_stats"])
    category_scores = gen_category_stats(stats[0]["category_stats"])
    if category_id is None:
        all_articles = list(db.articles.find(limit=120, sort=[("published_date", -1)]))
    else:
        #Get the feeds
        feeds = db.feeds.find({"category_id": category_id["_id"]}, projection= {"_id": 1})
        #Get list of feeds corresonding to cat id
        feeds = list(map(lambda x: x["_id"], feeds))
        #Get all articles in those feeds
        all_articles = list(db.articles.find({"feed_id": {"$in": feeds}}, limit=120, sort=[("published_date", -1)]))
    for article in all_articles:
        article["score"] = gen_article_score(article, entity_scores, category_scores, article["_id"] in history)

    all_articles.sort(key = sortByScore)
    return all_articles[skip: skip+12]

def pick(a, prop):
    return [x[prop] for x in a]

@app.route("/api/comment", methods=['POST'])
def comment():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    article_id = ObjectId(content["article_id"])
    against = content["against"]
    statement = content["statement"]
    print(user_id, article_id, against, statement)
    db.comments.insert({"user_id": user_id, "article_id": article_id, "against": against, "statement": statement, "thumbs_up": 0})
    return jsonify({})

@app.route("/api/get_comments", methods=['POST'])
def get_comments():
    content = request.json
    print(content)
    article_id = ObjectId(content["article_id"])
    against = content["against"]
    return jsonify(db.comments.find({"article_id": article_id, "against": against}))

@app.route("/api/thumbs_up", methods=['POST'])
def thumbs_up():
    content = request.json
    print(content)
    comment_id = content["comment_id"]
    db.comment.update_one({"_id":comment_id} ,{"$inc": {"thumbs_up": 1}})
    return jsonify({})

@app.route("/api/get_article", methods=['POST'])
def get_article():
    content = request.json
    print(content)
    article_id = ObjectId(content["article_id"])
    return jsonify(db.articles.find_one({"_id": article_id}))

@app.route("/api/get_name", methods=['POST'])
def get_name():
    content = request.json
    user_id = ObjectId(content["user_id"]["$oid"])
    print(user_id)
    return jsonify(db.users.find_one({"_id": user_id}))

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
        {"$set":{"id": iden, "name": name, "friends": friends}, 
         "$setOnInsert":{"joined": datetime.now(), "streak": {"length": 0, "last_time": datetime.fromtimestamp(0)}}},
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

@app.route("/api/articles/trending", methods=['POST'])
def articlesByEntity():
    return jsonify(get_trending_entities())

@app.route("/api/articles/trending/<entity>", methods=['POST'])
def trendingEntities(entity):
    skip = request.args.get("skip")
    if skip == None:
        skip = 0
    else:
        try:
            skip = int(skip)
        except:
            skip = 0
    e = db.entities.find_one({"name": entity})
    if e is None:
        return jsonify([])
    else:
        displayedArticles = get_articles_given_entity(e, skip)
        addMetadata(displayedArticles)
        return jsonify(displayedArticles)

@app.route("/api/articles/categories/<category>", methods=['POST'])
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
    NOW = datetime.now()
    TWO_DAYS = timedelta(days=2)
    DAY = timedelta(days=1)
    db.users.update_one({"_id": user_id, "streak.last_time": {"$lt": NOW - TWO_DAYS}}, {"$set": {"streak": {"length": 1, "last_time": NOW}}})
    db.users.update_one({"_id": user_id, "streak.last_time": {"$gt": NOW - TWO_DAYS, "$lt": NOW - DAY}}, {"$inc": {"streak.length": 1}, "$set": {"streak.last_time": NOW}})
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
    return jsonify(list(
        db.users.aggregate([{
            "$match": {
                "_id": user_id
            }
        }, {
            "$project": {
                "_id": 0,
                "id": 0,
                "name": 0,
                "friends": 0
            }
        }, {
            "$unwind": "$read"
        }, {
            "$project": {
                "_id": "$read.article_id",
                "access_time": "$read.time"
            }
        }, {
            "$lookup": {
                "from": "articles",
                "localField": "_id",
                "foreignField": "_id",
                "as": "info"
            }
        }, {
            "$project": {
                "_id": 1,
                "access_time": 1,
                "url": {
                    "$arrayElemAt": ["$info.url", 0]
                },
                "title": {
                    "$arrayElemAt": ["$info.title", 0]
                }
            }
        }])))

@app.route("/api/all_articles_sources_cats", methods=['POST'])
def all_articles_source_cats():
    content = request.json
    print(content)
    user_id = ObjectId(content["user_id"]["$oid"])
    return jsonify(list(
        db.users.aggregate([{
            "$match": {
                "_id": user_id 
            }
        }, {
            "$project": {
                "_id": 0,
                "id": 0,
                "name": 0,
                "friends": 0
            }
        }, {
            "$unwind": "$read"
        }, {
            "$project": {
                "_id": "$read.article_id",
                "access_time": "$read.time"
            }
        }, {
            "$lookup": {
                "from": "articles",
                "localField": "_id",
                "foreignField": "_id",
                "as": "info"
            }
        }, {
            "$project": {
                "_id": 1,
                "access_time": 1,
                "url": {
                    "$arrayElemAt": ["$info.url", 0]
                },
                "title": {
                    "$arrayElemAt": ["$info.title", 0]
                },
                "feed_id": {
                    "$arrayElemAt": ["$info.feed_id", 0]
                }
            }
        },  {
            "$facet": {
                "history": [{"$project": {"_id": 1, "access_time": 1, "url": 1, "title": 1}}],
                "categories": [
                    {
                        "$lookup": {
                            "from": "feeds",
                            "localField": "feed_id",
                            "foreignField": "_id",
                            "as": "feed_info"
                        }
                    },  {
                        "$project": {
                            "cat_id": {
                                "$arrayElemAt": ["$feed_info.category_id", 0]
                            }
                        }
                    }, {
                        "$group": {
                            "_id": "$cat_id",
                            "count": {
                                "$sum": 1
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
                    }
                ],
                "sources": [
                    {
                        "$lookup": {
                            "from": "feeds",
                            "localField": "feed_id",
                            "foreignField": "_id",
                            "as": "feed_info"
                        }
                    }, {
                        "$project": {
                            "src_id": {
                                "$arrayElemAt": ["$feed_info.source_id", 0]
                            }
                        }
                    }, {
                        "$group": {
                            "_id": "$src_id",
                            "count": {
                                "$sum": 1
                            }
                        }
                    }, {
                        "$lookup": {
                            "from": "sources",
                            "localField": "_id",
                            "foreignField": "_id",
                            "as": "src_id"
                        }
                    }, {
                        "$project": {
                            "_id": 1,
                            "count": 1,
                            "title": {
                                "$arrayElemAt": ["$src_id.title", 0]
                            }
                        }}
                ]}}]))[0])
            

@app.route("/api/categories", methods=['POST'])
def meta_categories():
    content = request.json
    user_id = ObjectId(content["user_id"]["$oid"])
    return jsonify(list(
        db.users.aggregate([{
            "$match": {
                "_id": user_id
            }
        }, {
            "$project": {
                "_id": 0,
                "id": 0,
                "name": 0,
                "friends": 0
            }
        }, {
            "$unwind": "$read"
        }, {
            "$project": {
                "_id": "$read.article_id",
                "access_time": "$read.time"
            }
        }, {
            "$lookup": {
                "from": "articles",
                "localField": "_id",
                "foreignField": "_id",
                "as": "info"
            }
        }, {
            "$project": {
                "_id": 1,
                "access_time": 1,
                "url": {
                    "$arrayElemAt": ["$info.url", 0]
                },
                "title": {
                    "$arrayElemAt": ["$info.title", 0]
                },
                "feed_id": {
                    "$arrayElemAt": ["$info.feed_id", 0]
                }
            }
        },    {
            "$lookup": {
                "from": "feeds",
                "localField": "feed_id",
                "foreignField": "_id",
                "as": "feed_info"
            }
        }, {
            "$project": {
                "cat_id": {
                    "$arrayElemAt": ["$feed_info.category_id", 0]
                }
            }
        }, {
            "$group": {
                "_id": "$cat_id",
                "count": {
                    "$sum": 1
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
    return jsonify(list(
        db.users.aggregate([{
            "$match": {
                "_id": user_id
            }
        }, {
            "$project": {
                "_id": 0,
                "id": 0,
                "name": 0,
                "friends": 0
            }
        }, {
            "$unwind": "$read"
        }, {
            "$project": {
                "_id": "$read.article_id",
                "access_time": "$read.time"
            }
        }, {
            "$lookup": {
                "from": "articles",
                "localField": "_id",
                "foreignField": "_id",
                "as": "info"
            }
        }, {
            "$project": {
                "_id": 1,
                "access_time": 1,
                "url": {
                    "$arrayElemAt": ["$info.url", 0]
                },
                "title": {
                    "$arrayElemAt": ["$info.title", 0]
                },
                "feed_id": {
                    "$arrayElemAt": ["$info.feed_id", 0]
                }
            }
        },    {
            "$lookup": {
                "from": "feeds",
                "localField": "feed_id",
                "foreignField": "_id",
                "as": "feed_info"
            }
        }, {
            "$project": {
                "src_id": {
                    "$arrayElemAt": ["$feed_info.source_id", 0]
                }
            }
        }, {
            "$group": {
                "_id": "$src_id",
                "count": {
                    "$sum": 1
                }
            }
        }, {
            "$lookup": {
                "from": "sources",
                "localField": "_id",
                "foreignField": "_id",
                "as": "src_id"
            }
        }, {
            "$project": {
                "_id": 1,
                "count": 1,
                "title": {
                    "$arrayElemAt": ["$src_id.title", 0]
                }
            }}
        ])))

if __name__ == "__main__":
   app.run(host="0.0.0.0", port=port)
