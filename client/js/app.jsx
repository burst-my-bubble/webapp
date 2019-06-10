import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import CalendarHeatmap from 'react-calendar-heatmap';
import { PieChart, Pie, Cell, Tooltip } from "recharts";
import cloud from "d3-cloud";
import * as d3 from "d3";

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

    const entries = this.state.data.sort((a, b) => {
      return b.count - a.count
    }).map(({_id, title, count}) => 
      <tr key={_id["$oid"]}>
        <td>{title}</td>
        <td>{count}</td>
      </tr>);

    const data = this.state.data.map(({title, count}) => {
      return {name: title, value: count};
    });

    return <div className="container">
      <br/>
      <table className="table table-bordered">
        <tbody>
          {entries}
        </tbody>
      </table>
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

    const entries = this.state.data.sort((a, b) => {
      return b.count - a.count
    }).map(({_id, title, count}) => 
      <tr key={_id["$oid"]}>
        <td>{title}</td>
        <td>{count}</td>
      </tr>);

    return <div className="container">
      <br/>
      <table className="table table-bordered">
        <tbody>
          {entries}
        </tbody>
      </table>
    </div>
  }
}

class Profile extends React.Component {
  constructor(props) {
    super();
    this.state = {
      loaded: false
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

  loadData() {
    var id = this.state.id;
    axios.post(SERVER_URI + "api/all_articles_sources_cats", {user_id: id}).then(({data}) => {
      console.log("helloao");
      axios.post(SERVER_URI + "api/get_name", {user_id: id}).then((a) => {
        console.log("tester");
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

  render() {
    if (!this.state.loaded) {
      return null;
    }
    console.log(this.state.data);
    var articles = this.state.data.history.sort((a, b) => 
      b.access_time["$date"] - a.access_time["$date"]
    ).map(a => Object.assign({}, a, {access_time: new Date(a.access_time["$date"])}));
    
    var TODAY = new Date(Date.now());
    var TODAY_365 = new Date(TODAY);
    TODAY_365.setDate(TODAY.getDate() - 100);

    var lastWeek = articles.filter(a => this.daysBetween(a.access_time, TODAY) <= 7);
    var today = lastWeek.filter(a => this.sameDay(a.access_time, TODAY));
    var notTodayButLastWeek = lastWeek.filter(a => !this.sameDay(a.access_time, TODAY));
    var lastMonth = articles.filter(a => this.daysBetween(a.access_time, TODAY) > 7);

    var joinDate = new Date(this.state.data2["joined"].$date);

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

    var TWO_DAYS = new Date();
    TWO_DAYS.setDate(TWO_DAYS.getDate() - 2);

    var streak = 0;
    if (new Date(this.state.data2.streak.last_time["$date"]) > TWO_DAYS) {
      streak = this.state.data2.streak.length;
    }

    return <div className="container">
<br/>
 <div className="row">
   <div className="col-md-3">
     <div className="sidebar stat">
        <img style={{maxWidth:"100%", borderRadius:"150px"}} src={"https://graph.facebook.com/" + this.state.data2.id + "/picture?width=900"}/>
        <br/><br/>
        <h2 style={{textAlign:"center"}}>{this.state.data2["name"]}</h2>
        <p style={{textAlign:"center"}}>User since {joinDate.toDateString()}</p>
     </div>
     <br/>
     <div className="stat">
     <CalendarHeatmap
  startDate={TODAY_365}
  endDate={TODAY}
  values={tMap}
  classForValue={(value) => {
    console.log(value);
    if (!value) {
      return 'color-empty';
    }
    return `color-scale-${value.count}`;
  }}
/>
     </div>
     
   </div>
   <div className="col-md-9">
     <div className="row">
       <div className="col-md-12">
       <div className="small-nav">
     <div className="nav nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
          <Link to={"/user/" + this.props._id["$oid"]} className="nav-link active">Summary</Link>
          <Link to={"/user/" + this.props._id["$oid"] + "/categories"} className="nav-link">Categories</Link>
          <Link to={"/user/" + this.props._id["$oid"] + "/sources"} className="nav-link">Sources</Link>
          <Link to={"/user/" + this.props._id["$oid"] + "/archive"} className="nav-link">Archive</Link>
        </div>
     </div>
     <br/>
       </div>
     
   <div className="col-md-4">
     <div className="card stat"><h1>{streak}</h1> day streak.</div>
   </div>
   <div className="col-md-4">
     <div className="card stat"><h1><Link to={"/user/" + this.props._id["$oid"] + "/categories"}>{lastWeek.length}</Link></h1> articles read this week. {topCategory} being your favourite category.
     <PieChart width={200} height={200}>
        <Pie dataKey="value"  isAnimationActive={false} data={data2} cx={100} cy={100} outerRadius={80} fill="#8884d8">
        {
            data2.map((entry, index) => <Cell key={`cell-${index}`} fill={COLOURS[index % COLOURS.length]} />)
          }
        </Pie>
        <Tooltip />
      </PieChart>
     </div>
   </div>
   <div className="col-md-4">
   <div className="card stat"><h1><Link to={"/user/" + this.props._id["$oid"] + "/sources"}>{this.state.data.sources.length}</Link></h1> different news sources read this week. {topSource} being your favourite news source.
     
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
  
      
<br/>
  <div className="stat">
  <h4>Today</h4>
        {this.toHtml(today)}
        <h4>Last Week</h4>
        {this.toHtml(notTodayButLastWeek)}
        <h4>Last Month</h4>
        {this.toHtml(lastMonth)}
  </div>
        
    </div>
    </div>

</div>;
  }

  daysBetween(first, second) {
      return Math.round((second - first)/(1000 * 60* 60* 24));
  }

  toHtml(articles) {
    var result = articles.map(article => {
      return <tr key={article._id["$oid"]}>
        <td><a href={article.url} target="_blank" onClick={() => this.markAsRead(article._id)}>{article.title}</a></td> 
    </tr>});
    return <table className="table table-sm table-bordered">
      <tbody>{result}</tbody>
    </table>;
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
    this.state = {
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

  render() {

    if (!this.state.loaded) {
      return null;
    }
    var article = this.state.data;
    return <div className="container">

      <div className="card article" style={{boxShadow:"5px 5px 5px grey"}}>
          <a onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>
            <img src={article.image_url} className="card-img-top"/>
          </a>
          <div className="card-body body-font">
            <p className="card-text">
              <a className="no-link" onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>{article.title}</a>
            </p>
            <p>
              {article.description}
            </p>
            <span className="label badge badge-primary badge-primary">{new Date(article.published_date.$date).toDateString()}</span>
          </div>
        </div>

    </div>;
  }

}

const NoMatch = () =>
  <p>Page Not Found</p>;

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
        <Route path="/user/:id/sources" exact component={({match}) => <ProfileSources _id={{"$oid":match.params.id}}  id={this.props.id}/>}/>
        <Route path="/user/:id/categories" exact component={({match}) => <ProfileCategories _id={{"$oid":match.params.id}} id={this.props.id}/>}/>
        <Route path="/user/:id" exact component={({match}) => <Profile myid={this.props._id} _id={{"$oid":match.params.id}} id={this.props.id}/>}/>
        <Route path="/friends" exact component={() => <Friends _id={this.props._id} id={this.props.id}/>}/>

        <Route path="/article/:id/comments" exact component={({match}) => <Comments id={this.props.id} aid={match.params.id}/>}/>
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
    const people = this.state.data.map(({_id, id, name}) => {
      return <div className="col-md-3" key={id}><div className="card article"><div className="card-body">
        <Link to={"/user/" + _id["$oid"]}><img className="profile" src={"https://graph.facebook.com/" + id + "/picture?type=normal"}/></Link>
        <h4>{name}</h4>
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
      return <div className="col-md-3" key={id}>
        <div className="card article" style={{boxShadow:"5px 5px 5px grey"}}>
          <a onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>
            <img src={article.image_url} className="card-img-top"/>
          </a>
          <div className="card-body body-font">
            <p className="card-text">
              <a className="no-link" onClick={() => this.markAsRead(article._id)} target="_blank" href={article.url}>{article.title}</a>
            </p>
            <Link to={"/article/" + id + "/comments"} className="card-link">Opinions&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</Link>
            <span style={{color:this.getColour(article.sentiment)}}>◉</span>
            {tags}
            <span className="label badge badge-primary badge-primary">{new Date(article.published_date.$date).toDateString()}</span>
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
  otherfunc(data){
    console.log(data)
    var words = data.map((x) => {return {text: x.name, size: x.score, test: "haha"}});
    this.layout = cloud()
    .size([500, 500])
    .words(words)
    .padding(5)
    .rotate(function() { return ~~(Math.random() * 2) * 90; })
    .font("Impact")
    .fontSize(function(d) { return d.size; })
    .on("end", this.draw.bind(this))
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
      .append("g")
        .attr("transform", "translate(" + this.layout.size()[0] / 2 + "," + this.layout.size()[1] / 2 + ")")
      .selectAll("text")
        .data(words)
      .enter().append("text")
        .style("font-size", function(d) { return d.size + "px"; })
        .style("font-family", "Impact")
        .attr("text-anchor", "middle")
        .on("click", (d)=> {window.location = "/trending/" + d.text})
        .attr("transform", function(d) {
          return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
        })
        .text(function(d) { return d.text; });
  }

  render() {
    return <div id="Graph"></div>
  }
}

window.ready = () => {
  ReactDOM.render(<App/>, document.getElementById("container"));
};


