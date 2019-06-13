import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import CalendarHeatmap from 'react-calendar-heatmap';
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import cloud from "d3-cloud";
import * as d3 from "d3";
import Toggle from 'react-bootstrap-toggle';
import { Modal, Button } from "react-bootstrap";

class Login extends React.Component {
  render() {
    return (
      <div className="login-container"xs>

        <div className="title login-title">BURST MY BUBBLE</div>
        <div className="login-text">
          <h1>Want to expand your horizons?</h1>
          <p> Well then you've come to the right place!
            <br></br>Here at Burst My Bubble, our aim is to do just that, by showing you news from sources you don't usually visit.
            <br></br> We use advanced machine learning in order to curate personalised news feeds on topics you are genuinely interested in, 
            but from a different perspective.
            <br></br> The site learns as you use it, so the recommendation will keep getting more accurate over time.
            <br></br> It's easy to sign up, just log in with Facebook and we do the rest! </p>
            
            <div className="fb-login-button" data-width="" data-size="large" data-button-type="continue_with" data-auto-logout-link="false" data-use-continue-as="true" data-scope="user_friends" data-onlogin="login()"></div>
        </div>

        <div id="background-wrap">
          <div className="bubble x1"></div>
          <div className="bubble x2"></div>
          <div className="bubble x3"></div>
          <div className="bubble x4"></div>
          <div className="bubble x5"></div>
          <div className="bubble x6"></div>
          <div className="bubble x7"></div>
          <div className="bubble x8"></div>
          <div className="bubble x9"></div>
          <div className="bubble x10"></div>
        </div>

      </div>
      );
  }

  componentDidMount() {
    window.login = () => {
      FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
          var accessToken = response.authResponse.accessToken;
          axios.post(SERVER_URI + 'api/register_user', {
            access_token: accessToken
          })
          .then((res) => {
            console.log(response);
            this.props.login(response.authResponse.userID, res.data._id);
          });
        } 
      });
    };
    FB.XFBML.parse();
  }
};

class App extends React.Component {
  constructor() {
    super();
    this.state = {
      loaded: false
    };
    
  }

  componentDidMount() {
    FB.getLoginStatus((response) => {
      if (response.status === "not_authorized" || response.status === "unknown") {
        this.setState({loaded: true, id: ""});
      } else {
        axios.post(SERVER_URI + 'api/get_user_id', {
          id: response.authResponse.userID
        })
        .then((r) => {
          console.log(r)
          /*FB.api("/" + id + "/friends", (res) => {
            console.log(res);
          });*/
          this.setState({loaded: true, id: response.authResponse.userID, _id: r.data._id});
        }); 
      }
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    if (!this.state.id) {
      return <Login login={(id, _id) => this.setState({id: id, _id: _id})}/>;
    } else {
      return <Main id={this.state.id} _id={this.state._id} logout={() => {
        FB.logout();
        this.setState({id: ""});
      }}/>
    }
  }
}

const data01 = [
  { name: 'Group A', value: 400 }, { name: 'Group B', value: 300 },
  { name: 'Group C', value: 300 }, { name: 'Group D', value: 200 },
  { name: 'Group E', value: 278 }, { name: 'Group F', value: 189 },
];

const RADIAN = Math.PI / 180;

const COLOURS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', "#ff5454", "#8f5bd1"];

const customLabel = (props) => {
  console.log("hi", props);
    const radius = props.outerRadius;
    const x = props.cx + radius * Math.cos(-props.midAngle * RADIAN);
    const y = props.cy + radius * Math.sin(-props.midAngle * RADIAN);
    return <text x={props.x} y={props.y} textAnchor={x > props.cx ? 'start' : 'end'} dominantBaseline="central">
    {props.name}
  </text>;
}

class ProfileSources extends React.Component {
  constructor(props) {
    super();
    this.state = {
      loaded: false
    };
    axios.post(SERVER_URI + "api/sources", {user_id: props._id}).then(({data}) => {
      this.setState({
        loaded: true,
        data: data
      });
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }


    const data = this.state.data.map(({title, count}) => {
      return {name: title, value: count};
    });

    return <div className="container">
      <br/>
    <div className="row">
        <div className="col-md-3">
          <Sidebar myid={this.props.myid} _id ={this.props._id}/>
        </div>
      <div className="col-md-9">
        <ProfileNav active={"Sources"}_id={this.props._id} />
        <br/>
      <table className="table table-bordered">
        <tbody>
          {entries}
        </tbody>
      </table>
      </div>
      </div>
      <br/>
      <PieChart width={400} height={400}>
        <Pie dataKey="value" label={customLabel} isAnimationActive={false} data={data} cx={200} cy={200} outerRadius={80} fill="#8884d8">
        {
            data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLOURS[index % COLOURS.length]} />)
          }
        </Pie>
      </PieChart>
    </div>
  }
}

class ProfileCategories extends React.Component {
  constructor(props) {
    super();
    this.state = {
      loaded: false
    };
    axios.post(SERVER_URI + "api/categories", {user_id: props._id}).then(({data}) => {
      this.setState({
        loaded: true,
        data: data
      });
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    return <div className="container">
      <br/>
      <div className="row">
        <div className="col-md-3">
          <Sidebar myid={this.props.myid} _id ={this.props._id}/>
        </div>
        <div className="col-md-9">      
        <ProfileNav active={"Categories"} _id={this.props._id} />
        <br/>
        </div>
      </div>
    </div>
  }
}

class ProfileNav extends React.Component {
  render() {
    return <div className="small-nav">
     <div className="nav flex-column" id="v-pills-tab" role="tablist" aria-orientation="vertical">
          <Link to={"/user/" + this.props._id["$oid"]} className={"nav-link" + (this.props.active === "Summary"? " active": "")}>Summary</Link>
          <Link to={"/user/" + this.props._id["$oid"] + "/categories"} className={"nav-link"+ (this.props.active === "Categories"? " active": "")}>Categories</Link>
          <Link to={"/user/" + this.props._id["$oid"] + "/sources"} className={"nav-link"+ (this.props.active === "Sources"? " active": "")} >Sources</Link>
        </div>
     </div>
  }
}

class Profile extends React.Component {
  constructor(props) {
    super();
    this.state = {
      loaded: false,
      show: false,
      show2: false 
    }; 
  }

  static getDerivedStateFromProps(nextProps, nextState) {
    if (nextProps._id !== nextState.id) {
      return Object.assign({}, nextState, {
        id: nextProps._id
      });
    }
    return null;
  }

  componentDidMount() {
    this.loadData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.loaded || this.state.loadedId !== this.state.id) {
      this.loadData();
    }
  }
  
  getFirstName(name) {
    return name.split(" ")[0]
  }

  loadData() {
    var id = this.state.id;
    axios.post(SERVER_URI + "api/all_articles_sources_cats", {user_id: id}).then(({data}) => {
      axios.post(SERVER_URI + "api/get_name", {user_id: id}).then((a) => {
        this.setState({
          loaded: true,
          data: data,
          data2: a.data,
          loadedId: id,
          id: id
        });
      });
    });
  }

  handleClose() {
    this.setState({show: false});
  }

  handleClose2() {
    this.setState({show2: false});
  }


  topComments() {
    var comments = this.state.data.top_comments;
    if (comments[0] == null || comments[1] == null || comments[2] == null){
      return;
    }
    var n = "";
    if (this.props.myid["$oid"] === this.props._id["$oid"]) {
      n = "Your"
    } else {
      n = this.getFirstName(this.state.data2["name"]) + "'s"
    }
return <div className="card">
    <div className="card-header" style={{textAlign: "center"}}>{n} top comments</div>
      <ul className="list-group">
        <li className="list-group-item">
          <blockquote className="blockquote text-right" style={{marginBottom: "0"}}>
            <p className="mb-0">{this.state.data.top_comments[0].statement}</p>
            <footer className="blockquote-footer">from <i><Link to={"/article/"+ comments[0].article_id["$oid"] + "/comments"}>{comments[0].title}</Link></i></footer>
          </blockquote>
        </li>
        <li className="list-group-item text-right">
          <blockquote className="blockquote"style={{marginBottom: "0"}}>
            <p className="mb-0">{this.state.data.top_comments[1].statement}</p>
            <footer className="blockquote-footer">from <i><Link to={"/article/"+ comments[1].article_id["$oid"] + "/comments"}>{comments[1].title}</Link></i></footer>
          </blockquote>
        </li>
        <li className="list-group-item text-right" >
          <blockquote className="blockquote"style={{marginBottom: "0"}}>
            <p className="mb-0">{this.state.data.top_comments[2].statement}</p>
            <footer className="blockquote-footer">from <i><Link to={"/article/"+ comments[2].article_id["$oid"] + "/comments"}>{comments[2].title}</Link></i></footer>
          </blockquote>
        </li>
      </ul>
    </div>;
  }


  render() {
    if (!this.state.loaded) {
      return null;
    }
    var TWO_DAYS = new Date();
    TWO_DAYS.setDate(TWO_DAYS.getDate() - 2);

    var streak = 0;
    if (new Date(this.state.data2.streak.last_time["$date"]) > TWO_DAYS) {
      streak = this.state.data2.streak.length;
    }

    var readHistory = "";
    var pronoun = "";
    var n = "";
    var streak_msg = "";
    if (this.props.myid["$oid"] === this.props._id["$oid"]) {
      readHistory = "What you've been reading recently";
      pronoun = "your";
      n = "your"
      streak_msg = "You're on a " + streak + " day streak Keep it up!"
    } else {
      readHistory = "What " + this.getFirstName(this.state.data2["name"]) + "'s been reading recently";
      pronoun = "their";
      n = this.getFirstName(this.state.data2["name"]) + "'s"
      streak_msg =  this.getFirstName(this.state.data2["name"]) + "'s on a " + streak + " day streak!"
    }
    var articles = this.state.data.history.sort((a, b) => 
      b.access_time["$date"] - a.access_time["$date"]
    ).map(a => Object.assign({}, a, {access_time: new Date(a.access_time["$date"])}));
    
    var TODAY = new Date(Date.now());
    var TODAY_365 = new Date(TODAY);
    TODAY_365.setDate(TODAY.getDate() - 100);

    var lastWeek = articles.filter(a => this.daysBetween(a.access_time, TODAY) <= 7);
    var history = lastWeek.slice(0, 10);
    var map = {};
    articles.forEach(a => {
      var t = a.access_time;
      var y = (t.getMonth() + 1).toString();
      var y2 = t.getDate().toString();
      if (y.length < 2) {
        y = "0" + y;
      }
      if (y2.length < 2) {
        y2 = "0" + y2;
      }
      var m = t.getFullYear() + "-" + y + "-" + y2;
      if (!map[m]) {
        map[m] = 0;
      }
      map[m]++;
    });

    const entriesCategories = this.state.data.categories.sort((a, b) => {
      return b.count - a.count
    }).map(({_id, title, count}) => 
      <tr key={_id["$oid"]}>
        <td>{title}</td>
        <td>{count}</td>
      </tr>);

    const entriesSources = this.state.data.sources.sort((a, b) => {
      return b.count - a.count
    }).map(({_id, title, count}) => 
      <tr key={_id["$oid"]}>
        <td>{title}</td>
        <td>{count}</td>
      </tr>);

    var tMap = Object.entries(map).map(a => {
      return { date: a[0], count: a[1] };
    });


    console.log(tMap);

    const data = this.state.data.sources.map(({title, count}) => {
      return {name: title, value: count};
    });

    const topSource = this.state.data.sources.sort((a, b) => b.count - a.count)[0].title;
    const topCategory = this.state.data.categories.sort((a, b) => b.count - a.count)[0].title;

    const data2 = this.state.data.categories.map(({title, count}) => {
      return {name: title, value: count};
    });


    return <div className="container">
<br/>
 <div className="row">
   <div className="col-md-3">
       <Sidebar id={this.props.id} _id={this.props._id} myid={this.props.myid}/>
       <br/>
     <div className="card">
       <div className="card-body">
     <CalendarHeatmap
  startDate={TODAY_365}
  endDate={TODAY}
  values={tMap}
  classForValue={(value) => {
    if (!value) {
      return 'color-empty';
    }
    return `color-github-${Math.min(4, value.count)}`;
  }}
/>
    <div className="card-body" style={{padding: "1em", textAlign: "center"}}>{streak_msg}</div>
     </div>
     
   </div></div>
   <div className="col-md-9">
     <div className="row">
   <div className="col-md-4">
     <div className="card">
    <div className="card-header">How {n} friends are doing</div>
      <ul className="list-group list-group-flush">
        <li className="list-group-item profile-row">#1 <img className="miniprofile" src="https://graph.facebook.com/834147103608464/picture?type=small"/> <span className="profile-name">Hashan</span>  
        <span className="badge badge-pill profile-streak badge-primary">5</span>
</li>
        <li className="list-group-item profile-row">#2<img className="miniprofile" src="https://graph.facebook.com/2830315710343819/picture?type=small"/> <span className="profile-name">Hugo</span>         <span className="badge badge-pill profile-streak badge-primary">4</span>
 </li>
        <li className="list-group-item profile-row">#3 <img className="miniprofile" src="https://graph.facebook.com/10214598360096105/picture?type=small"/> <span className="profile-name">Jack</span>          <span className="badge badge-pill profile-streak badge-primary">3</span>
</li>
        <li className="list-group-item profile-row">#4 <img className="miniprofile" src="https://graph.facebook.com/2062703670502448/picture?type=small"/>  <span className="profile-name">Joe</span>          <span className="badge badge-pill profile-streak badge-primary">2</span>
</li>
      </ul>
    </div>
   </div>
   <div className="col-md-4">
     <div className="card">
       <div className="card-header">
        Topics
       <button style={{"padding": "0"}} className="btn btn-link float-right" onClick={() => this.setState({show: true})}>i</button>
       </div>
       <div className="card-body">
         <h2 style={{textAlign: "left"}}>{lastWeek.length}</h2>
         <p>articles read this week and <b>{topCategory}</b> was {pronoun} favourite.</p>
      <Modal show={this.state.show} onHide={this.handleClose.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Your Topic Breakdown</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <table className="table table-bordered">
              <tbody>
                {entriesCategories}
              </tbody>
            </table>

          </Modal.Body>
        </Modal>
     <PieChart width={200} height={200}>
        <Pie dataKey="value"  isAnimationActive={false} data={data2} cx={100} cy={100} outerRadius={80} fill="#8884d8">
        {
            data2.map((entry, index) => <Cell key={`cell-${index}`} fill={COLOURS[index % COLOURS.length]} />)
          }
        </Pie>
        <Tooltip />
      </PieChart>
      </div></div>
   </div>
   <div className="col-md-4">
     <div className="card">
       <div className="card-header">Sources
       <button style={{"padding": "0" }} className="btn btn-link float-right" onClick={() => this.setState({show2: true})}>i</button> 
       </div>
       <div className="card-body">
        <h2>{this.state.data.sources.length}</h2>
        <p>different news sources read this week and <b>{topSource}</b> was {pronoun} top one.</p>
      <Modal show={this.state.show2} onHide={this.handleClose2.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>View Sources</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <table className="table table-bordered">
              <tbody>
                {entriesSources}
              </tbody>
            </table>

          </Modal.Body>
        </Modal>
     
     <PieChart width={200} height={200}>
        <Pie dataKey="value"  isAnimationActive={false} data={data} cx={100} cy={100} outerRadius={80} fill="#8884d8">
        {
            data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLOURS[index % COLOURS.length]} />)
          }
        </Pie>
        <Tooltip />
      </PieChart>
      </div>
     </div>
   </div>
   </div>
  
      
<br/>
  <div className="card">
    <div className="card-header" style={{textAlign: "center"}}>{readHistory}</div>
    {this.toHtml(history)}
  </div>
    <br/>
    {this.topComments()}
    </div>
    </div>
</div>;
  }

  daysBetween(first, second) {
      return Math.round((second - first)/(1000 * 60* 60* 24));
  }

  toHtml(articles) {
    var result = articles.map(article => {
      return<li key={article._id["$oid"]} className="list-group-item"><a href={"/article/" + article._id["$oid"] + "/comments"} onClick={() => this.markAsRead(article._id)}>{article.title}</a></li> 
    });
    return <ul className="list-group list-group-flush">
      {result}
    </ul>;
  }

  sameDay(first, second) {
    return first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate();
  }

  markAsRead(id) {
    axios.post(SERVER_URI + "api/read", {user_id: this.props.myid, article_id: id}).then(() => {
      console.log("sent");
    });
  }
}

class Comments extends React.Component {
  constructor(props) {
    super(props);
    this.onToggle = this.onToggle.bind(this);
    this.state = {
      likedComms:[],
      message: "",
      placeholder:"Share your best reason for supporting or opposing this article",
      toggleActive: true,
      loaded: false,
      dropdown: ""
    };
    axios.post(SERVER_URI + "api/get_article", {article_id: this.props.aid}).then(({data}) => {
      this.setState({
        data: data,
        loaded: true
      });
    });
  }
  
  onToggle() {
    this.setState({ toggleActive: !this.state.toggleActive });
  }

  handleChange(event) {
    this.setState({message: event.target.value})
  }

  submitComment(){
    
    console.log(this.state.message);
    console.log(!this.state.toggleActive);

    axios.post(SERVER_URI + "api/comment", {user_id:this.props._id, article_id:this.props.aid, against:!this.state.toggleActive, statement:this.state.message});
    this.setState({placeholder: "Thank you for submitting your comment! If you would like to override it with a new one, please just submit again"});
    this.setState({message: ""});

  }

  thumbs_up(id) {
    console.log(id);
    if(!this.state.likedComms.includes(id)){
      axios.post(SERVER_URI + "api/thumbs_up", {comment_id:id});
      this.state.likedComms.push(id);
    }
  }

  getFirstName(name) {
    return name.split(" ")[0]
  }

  markAsRead(id) {
    axios.post(SERVER_URI + "api/read", {user_id: this.props._id, article_id: id}).then(() => {
      console.log("sent");
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    var article = this.state.data;
    var dstr = "No Date";
    if(article.published_date != null){
       dstr = new Date(article.published_date.$date).toDateString();
     }

    console.log(article.posComments);
    var posComments = "";
    if (article.posComments.length == 0){
      posComments = <p style={{textAlign:"center"}}>Nobody seems to have voiced their opinion yet, why don't you be the first?</p>;
    } else {
      posComments = article.posComments.map(({user_id, thumbs_up, against, statement, _id, article_id, user}) => 
       <tr key={_id["$oid"]}>
         <td>{statement}</td>
         <td>{this.getFirstName(user[0].name)}</td>
         <td><p id={_id} onClick={() => this.thumbs_up(_id)}>👍</p></td>
       </tr>);
    }

    console.log(article.negComments);
    var negComments = "";
    if (article.negComments.length == 0){
      negComments = <p style={{textAlign:"center"}}>Nobody seems to have voiced their opinion yet, why don't you be the first?</p>;
    } else {
      negComments = article.negComments.map(({user_id, thumbs_up, against, statement, _id, article_id, user}) => 
       <tr key={_id["$oid"]}>
         <td>{statement}</td>
         <td>{this.getFirstName(user[0].name)}</td>
         <td><p id={_id} onClick={() => this.thumbs_up(_id)}>👍</p></td>
       </tr>);
    }

      const top3pos = <div style = {{display: "flex", flexDirection: "row", justifyContent: "center",}}>{article.top3pos.map(({user_id, thumbs_up, against, statement, _id, article_id, user}, index) => 
      <div className={"circle" + (parseInt(index)+1)} dangerouslySetInnerHTML={{ __html:"<i>'" + statement+ "'</i> - " + this.getFirstName(user[0].name)}}></div>
      )}</div>

      const top3neg = <div style = {{display: "flex", flexDirection: "row", justifyContent: "center"}}>{article.top3neg.map(({user_id, thumbs_up, against, statement, _id, article_id, user}, index) => 
      <div className={"circle" + (parseInt(index)+1)} dangerouslySetInnerHTML={{ __html:"<i>'" + statement+ "'</i> - " + this.getFirstName(user[0].name)}}></div>
      )}</div>

    return <div className="container">

    <div className="row">
      <div className="col-md-3">
        <a onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>
          <img src={article.image_url} className="card-img-top"/>
        </a>
      </div>
      <div className="col-md-9">
        <a className="no-link" onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>
          <h1>
            {article.title}
          </h1>
        </a>
        <p>
          <div className="no_img" dangerouslySetInnerHTML={{ __html: article.description }} />
        </p>
        <span className="label badge badge-primary badge-primary">{dstr}</span>          

      </div>
    </div>
        <br></br>
        <h4>Here's what people are saying...</h4>
        <div className="outertable" style={{padding:"8px"}}>
          
          <div className="floatLeft">
          <div className="card article">
            <div className="card-header">Supporting Comments</div>
            <div className="card-body">
            <table className="table table-bordered">
              <tbody>
                {posComments}
              </tbody>
            </table>
            </div>
            
            </div>
          </div>
          <div className="floatRight">
          <div className="card article">
          <div className="card-header">Opposing Comments</div>
          <div className="card-body">
            <table className="table table-bordered">
              <tbody>
                {negComments}
              </tbody>
            </table>
            </div></div>
          </div>
        </div>
        

        <br></br>


        <h4>Read the most convincing arguments</h4>
        <div style={{display: "block", margin: "auto"}}>
              <h5 className="left">For...</h5>
              {top3pos}
              <br></br>
              <h5 className="left">...and Against</h5>
              {top3neg}
        </div>
        <br/>

        <div className="form-group">
          <h4><label htmlFor="comment">Now have your say!</label></h4>
          <textarea className="form-control" rows="5" id="comment" onChange={(e) => this.handleChange(e)} value={this.state.message} placeholder={this.state.placeholder}></textarea>
        </div>
        <div className="row" style={{margin: "0 auto", width:"300px"}}>
        <div className="col-md-12">

        <Toggle
          onClick={this.onToggle}
          on={<h2 style={{fontSize:"16px", paddingRight:"13px"}} className="rightalign">Support</h2>}
          off={<h2 style={{fontSize:"16px", paddingLeft:"13px"}} className="rightalign">Oppose</h2>}
          size="xs"
          onstyle="success"
          offstyle="danger"
          handlestyle="default"
          active={this.state.toggleActive}
          width={100}
          height={38}
        />
        &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
        <button className="btn btn-secondary" onClick={() => this.submitComment()}>Submit</button>
        </div>

        </div>
    </div>;

  }


}

const NoMatch = () =>
  <p>Page Not Found</p>;

class Sidebar extends React.Component {
  constructor(props) {
    super();
    this.state = {
      loaded: false,
      show: false 
    }; 
  }

  componentDidMount() {
    this.loadData();
  }

  handleClose() {
    this.setState({show: false});
  }

  handleSubmit() {
    axios.post(SERVER_URI + "api/edit_status", {user_id: this.props._id, status: this.state.status}).then(() => {
      this.handleClose();
      this.loadData();
    })
  }

  loadData() {
    var id = this.props._id;
      axios.post(SERVER_URI + "api/get_name", {user_id: id}).then((a) => {
        this.setState({
          loaded: true,
          data: a.data,
          loadedId: id,
          id: id
        });
      });
  }

  render() { 
    if (!this.state.loaded) {
      return null;
    }

    var button = null;
    if (this.props.myid["$oid"] === this.props._id["$oid"]) {
      console.log("yoooooo");
      button = <button className="btn btn-link" onClick={() => this.setState({show: true})}>
        <img src="/edit_icon.svg"/></button>
    }

    var joinDate = new Date(this.state.data["joined"].$date);

    return <div>
  <div className="card">
    <div className="card-body">
  <img style={{maxWidth:"100%", borderRadius:"150px"}} src={"https://graph.facebook.com/" + this.state.data.id + "/picture?width=900"}/>
    <br/><br/>
    <h2 style={{textAlign:"center"}}>{this.state.data["name"]}</h2>
    <p style={{textAlign:"center"}}>Bursting since {joinDate.toDateString().split(' ').slice(1).join(' ')}</p>
    <p style={{textAlign:"center"}}>"{this.state.data.status}" {button} </p>
  </div>
  <br/>
  <Modal show={this.state.show} onHide={this.handleClose.bind(this)}>
      <Modal.Header closeButton>
        <Modal.Title>Edit Status</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <textarea className="form-control edit-status" onChange={(e) => this.setState({status: e.target.value})} placeholder="Write an awesome status here."></textarea>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={this.handleClose.bind(this)}>
          Close
        </Button>
        <Button variant="primary" onClick={this.handleSubmit.bind(this)}>
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
    </div></div>
}
}

class Navbar extends React.Component {
  constructor() {
    super();
    this.state = {
      loaded: false,
      dropdown: "",
      mobileDropdown: "collapse"
    };
    this.eventHandler = this.handleClick.bind(this); 
    axios.get(SERVER_URI + "api/categories").then(({data}) => {
      this.setState({
        loaded: true,
        data: data
      })
    });
  }

  handleClick() {
    this.setState({
      dropdown: ""
    });
  }

  componentDidMount() {
    document.body.addEventListener("click", this.eventHandler);
  }

  componentWillUnmount() {
    document.body.removeEventListener("click", this.eventHandler);
  }

  toggle(e) {
    e.stopPropagation();
    this.setState({
      dropdown: this.state.dropdown === "" ? "show": ""
    });
  }


  mobileToggle() {
    this.setState({
      mobileDropdown: this.state.mobileDropdown === "" ? "collapse": ""
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    const categories = this.state.data.map((category) => 
      <li className="nav-item" key={category._id["$oid"]}>
        <Link className="nav-link ikaros" to={"/categories/" + category.slug}>{category.title}</Link>
      </li>);

    return <nav className="navbar navbar-dark navbar-expand-lg bg-primary">
      <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
        <li className="nav-item">
          <Link className="navbar-brand title" to="/"> 
            BURST MY BUBBLE
          </Link>
        </li>
      </ul>
      <button className="navbar-toggler" onClick={this.mobileToggle.bind(this)} type="button">
    <span className="navbar-toggler-icon"></span>
  </button> 
      <div className={"navbar-collapse " + this.state.mobileDropdown}>
      <ul className="navbar-nav mr-auto mt-2 mt-lg-0">
        <li className="nav-item"><Link className="nav-link ikaros" to={"/trending"}>Trending</Link></li>
        <li className="nav-item d-none d-lg-block nav-link ikaros">|</li>
       {categories}
      </ul>
      </div>   
     <div className="d-none d-lg-block">
     <ul className="navbar-nav">
        <li className="nav-item">
          <img className="profile" onClick={this.toggle.bind(this)} src={"https://graph.facebook.com/" + this.props.id + "/picture?type=normal"}/>
          <div className={"dropdown-menu dropdown-menu-right " + this.state.dropdown}>
            <Link to="/settings" className="dropdown-item">Settings</Link>
            <Link to="/friends" className="dropdown-item">Friends</Link>
            <Link to={"/user/" + this.props._id["$oid"]} className="dropdown-item">Profile</Link>
            <div className="dropdown-divider"></div>
            <button onClick={this.props.logout} className="btn dropdown-item btn-link" href="#">Logout</button>
          </div>
        </li>
      </ul>
      </div>
    </nav>;
  }
}

class Settings extends React.Component {
  constructor() {
    super();
    this.state = {
      loaded: false,
      dropdown: ""
    };
    axios.get(SERVER_URI + "api/categories").then(({data}) => {
      this.setState({
        loaded: true,
        data: data,
        selected: []
      })
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    const categories = this.state.data.map(({title, slug}) => {
      var css = (this.state.selected.includes(slug)) ? "active" : "";
      return <button key={slug} onClick={() => {
        var t = this.state.selected;
        if (!t.includes(slug)) {
          t = [slug].concat(t);
        } else {
          t = t.filter(a => a != slug);
        }
        this.setState({selected:t});
      }} className={"list-group-item list-group-item-action " + css}>
        {title}
      </button>;
    });
    return <div className="container">
      <br/><label>Filter which categories you wish to see:</label>
      <div className="list-group">
        {categories}
      </div>
      <button style={{marginTop: "10px"}} className="btn btn-primary">Save</button>
    </div>;
  }
}

class Main extends React.Component {
  render() {
    return <Router>
      <Navbar id={this.props.id} _id={this.props._id} logout={this.props.logout}/>
      <Switch>
        <Route path="/" exact component={() => <Home url="" id={this.props.id} _id={this.props._id}/>}/>
        <Route path="/user/:id/sources" exact component={({match}) => <ProfileSources _id={{"$oid":match.params.id}}  myid={this.props._id} id={this.props.id}/>}/>
        <Route path="/user/:id/categories" exact component={({match}) => <ProfileCategories _id={{"$oid":match.params.id}} myid={this.props._id} id={this.props.id}/>}/>
        <Route path="/user/:id" exact component={({match}) => <Profile myid={this.props._id} _id={{"$oid":match.params.id}} id={this.props.id}/>}/>
        <Route path="/friends" exact component={() => <Friends _id={this.props._id} id={this.props.id}/>}/>

        <Route path="/article/:id/comments" exact component={({match}) => <Comments _id={this.props._id} id={this.props.id} aid={match.params.id}/>}/>
        <Route path="/categories/:category" exact component={({match}) => <Home url={"/categories/" + match.params.category} id={this.props.id} _id={this.props._id}/>}/>
        <Route path="/trending/:entity" exact component={({match}) => <Home url={"/trending/" + match.params.entity} id={this.props.id} _id={this.props._id}/>}/>
        <Route path="/trending" exact component={() => <Trending id={this.props.id} _id={this.props._id}/>}/>
        <Route path="/settings" exact component={() => <Settings _id={this.props._id} id={this.props.id}/>}/>
        <Route component={NoMatch}/>
      </Switch>
    </Router>;
  }
}

class Friends extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false
    }
    axios.post(SERVER_URI + "api/friends", {user_id: this.props._id}).then(({data}) => {
      this.setState({
        data: data,
        loaded: true
      });
    });
  }

  render() {
    if (!this.state.loaded) {
      return null;
    }

    console.log(this.state.data);
    const people = this.state.data.map(({_id, id, name, status}) => {
      return <div className="col-md-3" key={id}><div className="card article"><div className="card-body">
        <Link to={"/user/" + _id["$oid"]}><img className="friend" src={"https://graph.facebook.com/" + id + "/picture?type=normal"}/></Link>
        <br/>
        <h4 style={{textAlign: "center"}}>{name}</h4>
        <br/>
        <p style={{textAlign: "center"}}>"{status}"</p>
      </div></div></div>
    });

    return <div className="container">
      <div className="row">
        {people}
      </div>
    </div>;
  }
}

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      url: props.url,
      page: 0
    };
    console.log(props.url);
  }

  static getDerivedStateFromProps(nextProps, nextState) {
    if (nextProps.url !== nextState.url) {
      return Object.assign({}, nextState, {
        url: nextProps.url
      });
    }
    return null;
  }

  componentDidMount() {
    this.loadData();
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this.state.loaded || this.state.url !== this.state.loadedUrl || this.state.page !== this.state.loadedPage) {
      this.loadData();
    }
  }

  loadData() {
    var page = this.state.page;
    var skip = page * 12;
    axios.post(SERVER_URI + "api/articles" + this.state.url + "?skip=" + skip, {user_id: this.props._id}).then(({data}) => {
      this.setState({
        loaded: true,
        data: data,
        loadedUrl: this.state.url,
        loadedPage: page
      });
    });
  }

  nextPage() {
    var nextPage = this.state.page + 1;
    this.setState({
      page: nextPage
    });
  }

  previousPage() {
    var previousPage = this.state.page - 1;
    this.setState({
      page: previousPage
    });
  }

  render() {
    const articles = !this.state.loaded ? [] : this.state.data.map((article) => { 
      const id = article._id["$oid"];
      const tags = article.entities.map(e => {
        return <span key={e.displayName} className="label badge badge-secondary">{e.displayName}</span>;
      });
      var dstr = "No Date";
      if(article.published_date != null){
         dstr = new Date(article.published_date.$date).toDateString();
       }

      return <div className="col-md-3" key={id}>
        <div className="card article" style={{}}>
          <a onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>
            <img src={article.image_url} className="card-img-top"/>
          </a>
          <div className="card-body body-font">
            <p className="card-text">
              <a className="no-link" onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>{article.title}</a>
            </p>
            <a className="btn btn-outline-primary btn-sm" href={"/article/" + id + "/comments"} role="button">Opinions</a>
            &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;
            <span style={{color:this.getColour(article.sentiment)}}>◉</span>
            {tags}
            <br/>
            <span className="label badge badge-primary badge-primary">{dstr}</span>
          </div>
        </div>
      </div>;
    });
    var previousPage = null;
    if (this.state.loadedPage != 0) {
      var previousPage = <button className="btn btn-secondary" style={{marginTop: "30px"}} onClick={this.previousPage.bind(this)}>Previous Page</button>
    }
    return <div>
        <div className="container">
          <div className="row">

            <div className="col-md-4">{previousPage}</div>
            <div className="col-md-4" style={{paddingTop:"30px"}}><h1 className="text-center ikaros">{this.getTitle(this.state.url)}</h1></div>
            <div className="col-md-4">
              <button className="btn btn-secondary float-right" style={{marginTop:"30px"}} onClick={this.nextPage.bind(this)}>Next Page</button>
            </div>
          </div>
          <div className="row">
            {articles}
          </div>
        </div>
      </div>
  }

  markAsRead(id) {
    axios.post(SERVER_URI + "api/read", {user_id: this.props._id, article_id: id}).then(() => {
      console.log("sent");
    });
  }

  getColour(sentiment) { 
    if(sentiment < 0.2){
      return "rgb(255, 0, 0)";
    } else if (sentiment < 0.4) {
      return "rgb(246, 84, 0)";
    } else if (sentiment < 0.6) {
      return "rgb(243, 154, 0)";
    } else if (sentiment < 0.8) {
      return "rgb(194, 243, 0)";
    }
    return "rgb(1, 255, 0)";
  }

  getTitle(url) {
    if (url == "") {
      return "Your Feed";
    } else {
      var key = url.split('/')[2];
      return key.charAt(0).toUpperCase() + key.slice(1) + " Feed";
    }
  }


}

class Trending extends React.Component {

  handleMouseOver(d) {
    console.log(this)
  }

  otherfunc(data){
    console.log(data)
    var words = data.map((x) => {return {text: x.name, size: x.score, test: "haha"}});
    var myScale = d3.scaleLinear()
    .domain([words[words.length - 1].size, words[0].size])
    .range([20,50]);
    console.log(words[words.length - 1].size, words[0].size);
    console.log(myScale(0));
    this.layout = cloud()
    .size([1600, 800])
    .words(words)
    .padding(5)
    .rotate(d3.randomUniform(-70, 70))
    .font("ubuntu")
    .fontSize(d => myScale(d.size))
    .on("end", this.draw.bind(this));
    this.layout.start();
  }
  componentDidMount(){
    axios.post(SERVER_URI + "api/articles/trending", {}).then(({data}) => {
      this.otherfunc(data);
    });
  }

  draw(words) {
    d3.select("#Graph").append("svg")
        .attr("width", this.layout.size()[0])
        .attr("height", this.layout.size()[1])
        .style("display", "block")
        .style("margin", "auto")
      .append("g")
        .attr("transform", "translate(" + this.layout.size()[0] / 2 + "," + this.layout.size()[1] / 2 + ")")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "ubuntu")
        .style("font-weight", "bold")
        .style("cursor", "pointer")
        .style("fill", () => d3.schemeCategory10[Math.floor(Math.random() * d3.schemeCategory10.length)])
        .attr("text-anchor", "middle")
        .on("click", (d)=> {window.location = "/trending/" + d.text})
        .on("mouseover", function(d) {
            console.log(d)
            d3.select(this).node().parentNode.appendChild(this)
            d3.select(this).transition().style('font-size', d.size+30+"px")
        })
        .on("mouseout", function(d) {
            d3.select(this).transition().style('font-size', d.size+ "px")
        })
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
  }

  render() {
    return <div style={{marginTop: "60px"}}id="Graph"></div>
  }
}

window.ready = () => {
  ReactDOM.render(<App/>, document.getElementById("container"));
};


