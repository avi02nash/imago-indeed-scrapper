  const axios = require("axios");
  const querystring = require("querystring");
  const cheerio = require("cheerio");
  const baseUrl = "http://www.indeed.com/";

  const workingHoursInYear = 2080;
  const weeksInYear = 52;
  const hoursInDay = 8;
  const monthsInYear = 12;

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


  /**
   * @param {string} job title
   * @param {string} city
   * @param {string} state
   * @returns {string} Annual Salary.
   */
  async function salaryQuery(job, city, state) {

    const queryString = querystring.stringify({ q: job, l: `${city}+${state}` });
    const query = `${baseUrl}jobs?${queryString}`;
    let annualSalary = null;

    console.log(new Date() + `: fetching salary info for "${job}" in ${city},  ${state}`);

    try {
      const result = await axios.get(query);
      const $ =  cheerio.load(result.data);
      const salaries = $('.salaryText');
      if (salaries && salaries.first()) {
        annualSalary = checkAndReturnYearlySalary(salaries.first().text());
      }
    } catch(err) {
      console.log(err);
      annualSalary = null;
    }

    return annualSalary;
  }

  /**
   * @param {string} job title
   * @param {string} city
   * @param {string} state
   * @returns {promise} resolves to an object containing number of jobs
   */
  async function jobsQuery(job, city, state) {

    const jobsRe = /.*?([0-9,]*).*/,
      query =
        baseUrl +
        "jobs?" +
        querystring.stringify({
          as_phr: job,
          l: String.prototype.concat.call(city, ", ", state),
          radius: 0,
          psf: "advsrch"
        });
    let jobCount = null;

    console.log(new Date() + `: fetching job info for "${job}" in ${city},  ${state}`);

    try {
      const result = await axios.get(query);
      const $ =  cheerio.load(result.data);
      const metaDescriptionContent = $('meta[name="description"]').first().attr('content');
      if (jobsRe.test(metaDescriptionContent)) {
        const jobsString = metaDescriptionContent.match(jobsRe)[1];
        jobCount =  Number(jobsString.replace(/[^0-9]/, ""));
      }
    } catch(err) {
      console.log(err);
      jobCount = null;
    }
    return jobCount;
  }

  module.exports = {
    getInfo: async function(job, city, state) {
      return Promise.all([salaryQuery(job, city, state), jobsQuery(job, city, state)])
      .then(result => {
        return {
          salary: result[0],
          jobs: result[1]
        }
      });
    }
  };