import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import CalendarHeatmap from 'react-calendar-heatmap';
import { PieChart, Pie, Cell } from "recharts";

class Login extends React.Component {
  render() {
    return (
      <div className="fb-login-button" data-width="" data-size="large" data-button-type="continue_with" data-auto-logout-link="false" data-use-continue-as="true" data-scope="user_friends" data-onlogin="login()"></div>
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
            data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)
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
    axios.post(SERVER_URI + "api/all_articles", {user_id: props._id}).then(({data}) => {
      console.log("helloao");
      axios.post(SERVER_URI + "api/get_name", {user_id: props._id}).then((a) => {
        console.log("tester");
        this.setState({
          loaded: true,
          data: data,
          data2: a.data
        });
      });
    });
  }
  render() {
    if (!this.state.loaded) {
      return null;
    }
    console.log(this.state.data);
    var articles = this.state.data.sort((a, b) => 
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
          <a href="/" className="nav-link active">Summary</a>
          <a href="/categories" className="nav-link">Categories</a>
          <a href="/categories" className="nav-link">Sources</a>
          <a className="nav-link">Settings</a>
        </div>
     </div>
     <br/>
       </div>
     
   <div className="col-md-4">
     <div className="card stat"><h1>5</h1> day streak.</div>
   </div>
   <div className="col-md-4">
     <div className="card stat"><h1><Link to={"/user/" + this.props._id["$oid"] + "/categories"}>{lastWeek.length}</Link></h1> articles read this week. Technology being your favourite category.</div>
   </div>
   <div className="col-md-4">
     <div className="card stat"><h1><Link to={"/user/" + this.props._id["$oid"] + "/sources"}>10</Link></h1> different news sources read this week. TheGuardian being your favourite news source.</div>
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

const Comments = () => 
  <p>Comments Page</p>;

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
        <Route path="/article/:id/comments" exact component={() => <Comments id={this.props.id}/>}/>
        <Route path="/categories/:category" exact component={({match}) => <Home url={"/" + match.params.category} id={this.props.id} _id={this.props._id}/>}/>
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
            <Link to={"/article/" + id + "/comments"} className="card-link">Comments&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</Link>
            <span style={{color:this.getColour(article.sentiment)}}>◉</span>
            {tags}
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
      var key = url.substr(1)
      return key.charAt(0).toUpperCase() + key.slice(1) + " Feed";
    }
  }


}

window.ready = () => {
  ReactDOM.render(<App/>, document.getElementById("container"));
};


