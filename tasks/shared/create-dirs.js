var utils = require('shipit-utils');
var chalk = require('chalk');
var _ = require('lodash');
var util = require('util');
var init = require('../../lib/init');
var mapPromise = require('../../lib/map-promise');
var Promise = require('bluebird');
var path = require('path2/posix');

/**
 * Create required directories for linked files and dirs.
 */

module.exports = function(gruntOrShipit) {
  var foldersToCreate = [];
  var task = function task() {
    var shipit = utils.getShipit(gruntOrShipit);

    var getPathStr = function(el, basePath) {
      basePath = basePath || shipit.config.shared.basePath;
      var filePath = shipit.config.shared.remote ? path.join(basePath, el.path) : el.path;

      return el.isFile ? path.dirname(filePath) : filePath;
    };

    var createDir = function createDir(el) {
      foldersToCreate.push(getPathStr(el));
      if (shipit.config.shared.remote && shipit.releasePath) {
        foldersToCreate.push(getPathStr(el, shipit.releasePath));
      }

      return Promise.resolve();
    };

    return init(shipit)
        .then(function(shipit) {
          shipit.log(util.format('Creating shared directories on %s.', shipit.config.shared.shipitMethod));

          return mapPromise(shipit.config.shared.dirs, createDir)
              .then(mapPromise(shipit.config.shared.files, createDir))
              .then(function() {
                shipit.emit('sharedDirsCollected');
              });
        });
  };

  var execute = function execute() {
    var shipit = utils.getShipit(gruntOrShipit);
    if(foldersToCreate.length) {
      shipit.log(chalk.green('Ensuring to have shared folders (multiple check at once) on remote.'));

      return shipit.remote(util.format('mkdir -p %s', foldersToCreate.join(' ')))
        .then(function() {
          shipit.log(chalk.green(util.format('Directories exist on %s.', shipit.config.shared.shipitMethod)));
        }, function() {
          throw new Error(util.format('Could not create directories on %s.', shipit.config.shared.shipitMethod));
        })
        .then(function () {
          shipit.emit('sharedDirsCreated');
        });
    }
  };

  utils.registerTask(gruntOrShipit, 'shared:create-dirs-collect', task);
  utils.registerTask(gruntOrShipit, 'shared:create-dirs-execute', execute);
  utils.registerTask(gruntOrShipit, 'shared:create-dirs', [
    'shared:create-dirs-collect',
    'shared:create-dirs-execute'
  ]);
};
