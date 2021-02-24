const jsdom = require("jsdom");
const querystring = require("querystring");
const Q = require("q");
const cheerio = require("cheerio");
const baseUrl = "http://www.indeed.com/";
const _ = require("underscore");

const workingHoursInYear = 2080;
const weeksInYear = 52;
const hoursInDay = 8;
const monthsInYear = 12;

/**
 * @param {string} job title
 * @param {string} city
 * @param {string} state
 * @returns {promise} resolves to an object containing description, city, state, and salary
 */
function salaryQuery(job, city, state) {
  const salaryPromise = Q.defer(),
    //query = baseUrl + '/salaries/'+job+'-Salaries,-'+city+'-'+state+'?period=yearly';
    // New URL
    query =
      baseUrl +
      "jobs?" +
      querystring.stringify({
        q: job,
        l: city + "+" + state
      });

  console.log(
    new Date() +
      ': fetching salary info for "' +
      job +
      '" in ' +
      city +
      ", " +
      state
  );

  jsdom.env({
    url: query,
    done: function(errors, window) {
      if (errors) {
        salaryPromise.reject(errors);
      }
      const cheerioCount = window.document.getElementsByClassName("salaryText")
        .length;
      const annualSalary = null;
      if (cheerioCount !== 0) {
        const Cheerio = cheerio.load(
          window.document.getElementsByClassName("salaryText")[0].innerHTML
        );
        annualSalary = checkAndReturnYearlySalary(Cheerio.text());
      }
      //console.log(Cheerio.text());
      console.log("Annual salary", annualSalary);

      if (annualSalary) {
        salaryPromise.resolve({
          salary: annualSalary
        });
      } else {
        salaryPromise.resolve({
          salary: null
        });
      }
    }
  });

  return salaryPromise.promise;
}

/**
 * @param {string} job title
 * @param {string} city
 * @param {string} state
 * @returns {promise} resolves to an object containing number of jobs
 */
function jobsQuery(job, city, state) {
  "use strict";

  const jobsRe = /.*?([0-9,]*).*/,
    jobsPromise = Q.defer(),
    query =
      baseUrl +
      "jobs?" +
      querystring.stringify({
        as_phr: job,
        l: String.prototype.concat.call(city, ", ", state),
        radius: 0,
        psf: "advsrch"
      });

  console.log(
    new Date() +
      ': fetching job info for "' +
      job +
      '" in ' +
      city +
      ", " +
      state
  );

  // get number of jobs
  jsdom.env({
    url: query,
    done: function(errors, window) {
      if (errors) {
        jobsPromise.reject(errors);
      }

      const invalidLocation = window.document.getElementsByClassName(
        "invalid_location"
      ).length;
      const content = window.document.getElementsByName("description")[0].content,
        jobsString = "";
      if (jobsRe.test(content) && invalidLocation == 0) {
        jobsString = content.match(jobsRe)[1];

        jobsPromise.resolve({
          jobs: Number(jobsString.replace(/[^0-9]/, ""))
        });
      } else {
        jobsPromise.resolve({
          jobs: null
        });
      }
    }
  });

  return jobsPromise.promise;
}

function checkAndReturnYearlySalary(salaryText) {
  const scrubbed_value = salaryText.replace(/[^0-9\.\-]/g, "");
  const min_max = scrubbed_value.split("-");
  const salary =
    min_max.length > 1
      ? (Number(min_max[0]) + Number(min_max[1])) / 2
      : Number(min_max[0]);
  if (salaryText.search("a year") > 0) {
    return salary;
  } else if (salaryText.search("an hour") > 0) {
    return salary * workingHoursInYear;
  } else if (salaryText.search("a month") > 0) {
    return salary * monthsInYear;
  } else if (salaryText.search("a day") > 0) {
    return (salary / hoursInDay) * workingHoursInYear;
  } else if (salaryText.search("a week") > 0) {
    return salary * weeksInYear;
  }
}

module.exports = {
  getInfo: function(job, city, state) {
    "use strict";

    const dfd = Q.defer();

    if (!job || !city) {
      throw "Job and city are required";
    }

    Q.all([salaryQuery(job, city, state), jobsQuery(job, city, state)])
      .catch(function(error) {
        console.warn(new Date(), error);
      })
      .done(function(info) {
        dfd.resolve(_.extend({}, _.first(info), _.last(info)));
      });

    return dfd.promise;
  }
};
© 2020 GitHub, Inc.