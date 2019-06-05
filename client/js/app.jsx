import React from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import { BrowserRouter as Router, Route, Link, Switch } from "react-router-dom";
import CalendarHeatmap from 'react-calendar-heatmap';


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
   <div className="col-md-3">
     <div className="card"><h1><Link to={"/user/" + this.props._id["$oid"] + "/categories"}>75</Link></h1> articles read this week. Technology being your favourite category.</div>
   </div>
   <div className="col-md-3">
     <div className="card"><h1><Link to={"/user/" + this.props._id["$oid"] + "/sources"}>10</Link></h1> different news sources read this week. TheGuardian being your favourite news source.</div>
   </div>
   <div className="col-md-3">

   </div>
 </div>
      
<br/>
        <h4>Today</h4>
        {this.toHtml(today)}
        <h4>Last Week</h4>
        {this.toHtml(notTodayButLastWeek)}
        <h4>Last Month</h4>
        {this.toHtml(lastMonth)}
    </div>;
  }

  daysBetween(first, second) {
      return Math.round((second - first)/(1000 * 60* 60* 24));
  }

  toHtml(articles) {
    var result = articles.map(article => {
      return <tr key={article._id["$oid"]}>
        <td><a href={article.url}>{article.title}</a></td> 
        <td>{article.access_time.toString()}</td>
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
      dropdown: ""
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
        {categories}
      </ul>
      <ul className="navbar-nav">
        <li className="nav-item">
          <img className="profile" onClick={this.toggle.bind(this)} src={"https://graph.facebook.com/" + this.props.id + "/picture?type=normal"}/>
          <div className={"dropdown-menu dropdown-menu-right " + this.state.dropdown}>
            <a className="dropdown-item" href="#">Action</a>
            <Link to="/friends" className="dropdown-item">Friends</Link>
            <Link to={"/user/" + this.props._id["$oid"]} className="dropdown-item">Profile</Link>
            <div className="dropdown-divider"></div>
            <button onClick={this.props.logout} className="btn dropdown-item btn-link" href="#">Logout</button>
          </div>
        </li>
      </ul>
    </nav>;
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
        <Route path="/user/:id" exact component={({match}) => <Profile _id={{"$oid":match.params.id}} id={this.props.id}/>}/>
        <Route path="/friends" exact component={() => <Friends _id={this.props._id} id={this.props.id}/>}/>
        <Route path="/article/:id/comments" exact component={() => <Comments id={this.props.id}/>}/>
        <Route path="/categories/:category" exact component={({match}) => <Home url={"/" + match.params.category} id={this.props.id} _id={this.props._id}/>}/>
        <Route component={NoMatch}></Route>
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
      return <div className="card col-md-3" key={id}>
        <Link to={"/user/" + _id["$oid"]}><img className="profile" src={"https://graph.facebook.com/" + id + "/picture?type=normal"}/></Link>
        <h4>{name}</h4>
      </div>
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
      url: props.url
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
    if (!this.state.loaded || this.state.url !== this.state.loadedUrl) {
      this.loadData();
    }
  }

  loadData() {
    axios.post(SERVER_URI + "api/articles" + this.state.url, {user_id: this.props._id}).then(({data}) => {
      this.setState({
        loaded: true,
        data: data,
        page: 0,
        loadedUrl: this.state.url
      });
    });
  }

  nextPage() {
    var nextPage = this.state.page + 1;
    var skip = nextPage * 12;
    axios.post(SERVER_URI + "api/articles" + this.props.url + "?skip=" + skip, {user_id: this.props._id}).then(({data}) => {
      this.setState({
        loaded: true,
        data: data,
        page: nextPage
      });
    });
  }

  render() {
    const articles = !this.state.loaded ? [] : this.state.data.map((article) => { 
      const id = article._id["$oid"];
      const tags = article.entities.map(e => {
        return <span key={e.displayName} className="badge badge-secondary">{e.displayName}</span>;
      });
      return <div className="col-md-3" key={id}>
        <div className="card article">
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
    return <div>
        <div className="container">
          <div className="row">
            <div className="col-md-4 "></div>
            <div className="col-md-4" style={{"padding-top":"30px"}}><h1 className="text-center ikaros">Front Page</h1></div>
            <div className="col-md-4">
              <button className="btn btn-secondary float-right" style={{"margin-top":"30px"}} onClick={this.nextPage.bind(this)}>Next Page</button>
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

  getColour(sentiment){
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
}

window.ready = () => {
  ReactDOM.render(<App/>, document.getElementById("container"));
};


