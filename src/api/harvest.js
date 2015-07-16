module.exports = function () {
    var config = require('../config');
    var Harvest = require('harvest');

    var settings = config.readDomain('harvest', ['domain', 'email', 'password']);

    var result = new Harvest({
        subdomain: settings.domain,
        email: settings.email,
        password: settings.password
    });

    var userStoryPrefix = '> user_story #';
    var taskPrefix = '> task #';

    function extractId(l, prefix) {
        if(l.indexOf(prefix) === 0) {
            var p = l.substring(prefix.length).split(' ');
            var id = +p[0];
            var rest = p.slice(1).join(' ');
            return { id: id, name: rest };
        }
    }

    function processResult(client, cb) {
        return function () {
            Array.prototype.slice.call(arguments).forEach(function (arg) {
                if(!!arg && !!arg.day_entries) {
                    arg.day_entries.forEach(function (e) {
                        if(!e.notes) return;

                        var parts = [];
                        var tp_user_story_id, tp_task_id;
                        e.notes.match(/[^\r\n]+/g).forEach(function (l) {
                            var us = extractId(l, userStoryPrefix);
                            var task = extractId(l, taskPrefix);

                            if(us) e.tp_user_story = us;
                            else if(task) e.tp_task = task;
                            else parts.push(l);
                        });

                        e.notes = parts.join(' ');
                        e.running = !!e.timer_started_at;
                    });
                }
            });

            cb.apply(client, arguments);
        };
    }

    var baseClient = result.TimeTracking.client;
    result.TimeTracking.client = newClient = {};
    ['get', 'patch', 'post', 'put', 'delete'].forEach(function (m) {
        newClient[m] = function (url, data, cb) {
            baseClient[m].call(result, url, data, processResult(result, cb));
        };
    });

    return result;
};