var request = require('request');
require('js-yaml');
var fullconfig = require('./config').shift();
var exec = require('child_process').exec;

var indices = {};

var url = "http://sis.rutgers.edu/soc/courses.json?subject=$SUBJ&semester=12013&campus=NB&level=U";

function pull (subj, cb) {
  request(url.replace("$SUBJ", subj), function (err, res, body) {
    try {
      if (err) throw err;
      body = JSON.parse(body);
      cb(null, body);
    } catch (e) {
      cb(e);
    }
  });
}

function inspectSections (data) {
  data.forEach(function (course) {
    course.sections.forEach(function (section) {
      if (!indices[section.index])
        indices[section.index] = section.openStatus? "not_notified" : false;

      else if (indices[section.index] == "notified")
        indices[section.index] = section.openStatus? "notified" : "closed_notify";
    });
  });
} 

function message (address, index, status, desc) {
  console.log(new Date() + ": telling " + address + " that " + index + " is " + status);
  exec("echo '"+index+": "+desc+" is "+status+"' | mail "+address);
}

function notify (address, searches) {
  Object.keys(searches).forEach(function (index) {
    if (indices[index] == "not_notified") {
      message(address, index, "OPEN", searches[index]);
      indices[index] = "notified";
    }

    else if (indices[index] == "closed_notify") {
      message(address, index, "CLOSED", searches[index]);
      indices[index] = false;
    }
  });
}

Object.keys(fullconfig).forEach(function (name) {
  var config = fullconfig[name];
  console.dir(config);
  Object.keys(config.courses).forEach(function (subject) {
    setInterval(function () {
      pull(subject, function (err, data) {
        try {
          if (err) throw err;
          inspectSections(data);
          notify(config.address, config.courses[subject]);
          console.log(new Date() + ": got subject " + subject + " for " + name);
        } catch (e) {
          console.log(new Date() + ": Error pulling subject " + subject + " for " + name + ": " + e);
        }
      });
    }, config.interval * 1000);
  });
});

