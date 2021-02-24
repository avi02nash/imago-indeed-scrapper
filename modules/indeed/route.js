const scrapper = require('./scrapper');
const cache = require('memory-cache');

function processGet(req, res) {

  const key = JSON.stringify(req.params);
  const cached = cache.get(key);

  if (cached) {
    console.log(new Date() + ': retrieving info from cache for "' + req.params.job + '" in ' + req.params.city + ', ' + req.params.state);
    res.json(JSON.parse(cached));
  } else {
    try {
      scrapper.getInfo(req.params.job, req.params.city, req.params.state).then(function (jobsInfo) {
          cache.put(key, JSON.stringify(jobsInfo), 12 * 60 * 60 * 1000); // 12 hour cache
          res.json(jobsInfo);
      });
    } catch (e) {
      console.warn(e);
      res.send(400);
    }
  }
};

module.exports = (app) => {
  app.get('/jobs/:state/:city/:job', processGet);
}
