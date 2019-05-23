import React from "react";
import ReactDOM from "react-dom";

const Login = () => {
  return (
    <div className="fb-login-button" data-width="" data-size="large" data-button-type="continue_with" data-auto-logout-link="false" data-use-continue-as="true" data-onlogin="login()"></div>
  );
};

const Home = () => {
  return (
    <p>You're logged in</p>
  );
};

window.ready = () => {
  FB.getLoginStatus(function(response) {
    if (response.status === "not_authorized") {
      ReactDOM.render(<Login/>, document.getElementById("container"));
      FB.XFBML.parse();
    } else {
      ReactDOM.render(<Home/>, document.getElementById("container"));
    }
  });
};

window.login = () => {
  ReactDOM.render(<Home/>, document.getElementById("container"));
};
