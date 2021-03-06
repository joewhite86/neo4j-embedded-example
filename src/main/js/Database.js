var Promise = require('promise'),
    JavaMapper = require('./JavaMapper');

function Database(service) {
  this.service = service;
}

var debug;
if(process.env.NODE_DEBUG === 'database') {
  debug = function(fn) {fn();};
}
else {
  debug = function() {};
}

Database.prototype.getLong = function(value) {
  'use strict';

  var java = require('java');

  try {
    return java.newInstanceSync('java.lang.Long', value.toString());
  }
  catch(err) {
    throw err;
  }
};

Database.prototype.isLong = function(value) {
  'use strict';

  var java = require('java');

  try {
    java.newInstanceSync('java.lang.Long', value);
    return true;
  }
  catch(err) {
    return false;
  }
};

Database.prototype.query = function(query, queryParams) {
  'use strict';

  var that = this,
      java = require('java'),
      params = java.newInstanceSync('java.util.HashMap');

  if(typeof queryParams === 'object') {
    for(var key in queryParams) {
      if(queryParams.hasOwnProperty(key)) {
        var value = queryParams[key];
        params.putSync(key, value);
      }
    }
  }

  return new Promise(function(resolve, reject) {
    var columns, start, end;

    debug(function() {
      console.log('sending query: %s', query);
      start = (new Date()).getTime()
      if(queryParams) console.log('with params: %s', JSON.stringify(queryParams));
    });

    var promise = that.service.query(query, params).then(function(queryResult) {
      debug(function() {
        console.log('result received');
      });

      var result = [], _result = queryResult.result, rowResult, columnNames = queryResult.columnNames;

      debug(function() { 
        end = (new Date()).getTime();
        console.log('query took: %sms', end - start);

        if(columnNames.length) {
          console.log('columns: ' + columnNames.join(', '));
        }
        if(_result.length) {
          console.log(_result.length + ' records found');
        }
      });
      
      if(_result.length) {
        for(var i = 0; i < _result.length; i++) {
          columns = _result[i];
          rowResult = [];
          for(var j = 0; j < columnNames.length; j++) {
            rowResult[columnNames[j]] = JavaMapper.map(columns[j]);
          }
          result.push(rowResult);
        }
        debug(function() { console.log('mapping results took: %sms', (new Date()).getTime() - end); });
      }

      return result;
    });
    resolve(promise);
  });
};

Database.prototype.queryBuilder = function(params) {
  return new QueryBuilder(this, params)
}

function QueryBuilder(database, params) {
  this.database = database;

  this._deletes = [];
  this._match = [];
  this._optionalMatch = [];
  this._orderBy = [];
  this._returns = [];
  this._startAt = {};
  this._set = [];
  this._where = [];
  
  if(params) this.params(params);
}
/**
 * @private
 * Main query builder function. Manipulates the query for a count query to return the amount of possible values without limits.
 * @return {String} The built query.
 */
QueryBuilder.prototype.buildCountQuery = function() {
  return this.buildQuery(true);
};
/**
 * @private
 * Main query builder function. Can manipulate the query for a count query to return the amount of possible values without limits.
 * @param {Boolean} returnCount True if the query should be manipulated for a count query to return the amount of possible values without limits.
 * @return {String} The built query.
 */
QueryBuilder.prototype.buildQuery = function(returnCount) {
  var that = this, 
      query = [];

  var keys = Object.keys(that._startAt);
  if(keys.length > 0) {
    query.push('START ' + keys.map(function(key) {return key + '=' + that._startAt[key];}).join(', '));
  }

  if(that._match.length > 0) {
    query.push('MATCH ' + that._match.join(', '));
  }

  if(that._where.length > 0) {
    query.push('WHERE ' + that._where.join(' AND '));
  }
  
  if(that._optionalMatch.length > 0) {
    that._optionalMatch.forEach(function(match) {
      query.push('OPTIONAL MATCH ' + match);
    });
  }

  if(that._with) {
    if(that._returns.length > 0) {
      query.push('WITH ' + that._returns.join(', '));
      
      query.push(that._with.buildQuery(returnCount));
    }

    if(that._orderBy.length > 0) {
      query.push('ORDER BY ' + that._orderBy.map(function(sorter) {return sorter.field + ' ' + (sorter.dir||'ASC');}).join(', '));
    }

    if(that._limit) {
      if(that._limit.skip > 0) query.push('SKIP ' + that._limit.skip);
      query.push('LIMIT ' + that._limit.limit);
    }
  }
  else if(returnCount) {
    if(!that._counter) query.push('RETURN COUNT(*) as count ');
    else query.push('RETURN COUNT(' + that._counter + ') as count');
  }
  else {
    if(that._create) query.push('CREATE ' + that._create);
    else if(that._createUnique) query.push('CREATE UNIQUE ' + that._createUnique);

    if(that._deletes.length > 0) {
      query.push('DELETE ' + that._deletes.join(', '));
    }

    if(that._set.length > 0) {
      query.push('SET ' + that._set.join(', '));
    }

    if(that._returns.length > 0) {
      query.push('RETURN ' + that._returns.join(', '));
    }

    if(that._orderBy.length > 0) {
      query.push('ORDER BY ' + that._orderBy.map(function(sorter) {return sorter.field + ' ' + (sorter.dir||'ASC');}).join(', '));
    }

    if(that._limit) {
      if(that._limit.skip > 0) query.push('SKIP ' + that._limit.skip);
      query.push('LIMIT ' + that._limit.limit);
    }

    if(that._union) {
      query.push('UNION ' + that._union.buildQuery(returnCount));
    }
  }

  return query.join(' ');
};
/**
 * @chainable
 * Set the COUNT query. Useful if you use aggregate functions. The query builder itself would miss that.
 *     @example
 *     var query = database.queryBuilder();
 *     query.startAt({u: 'node:Users("*: *")'});
 *     query.returns('DISTINCT(u.surname) as surnames');
 *     query.count('DISTINCT(u.surname)');
 *     query.execute(...);
 * Without setting the count query, we would get the amount of total users, 
 * now we get only the amount of users with distinct surnames, as expected.
 * @param {String} count Count query.
 */
QueryBuilder.prototype.count = function(count) {
  this._counter = count;

  return this;
};
/**
 * @chainable
 * Add a CREATE section to your query.
 *     @example
 *     query.create('(n {name: "Homer"})');
 * Would create a new node with property "name" set to "Homer".
 * @param {String} create The part of the query normally following a CREATE statement.
 */
QueryBuilder.prototype.create = function(create) {
  this._create = create;

  return this;
};
/**
 * @chainable
 * Add a CREATE UNIQUE section to your query.
 *     @example
 *     query.startAt({n: 'node:Users("name: Homer")'});
 *     query.createUnique('(n)-[:KNOWS]->(m {name: "Ned Flanders"})');
 *     query.returns('n, m');
 * Looks if theres a user "Homer" who knows another user with name "Ned Flanders", if not, the relation and the user will be created.
 * @param {String} createUnique The part of the query normally following a CREATE UNIQUE statement.
 */
QueryBuilder.prototype.createUnique = function(createUnique) {
  this._createUnique = createUnique;

  return this;
};
/**
 * @chainable
 * Add deletions to the query.
 * @param {Object} deletes Can either be a comma separated list of identifiers or an array.
 */
QueryBuilder.prototype.deletes = QueryBuilder.prototype.delete = function(deletes) {
  if(arguments.length > 1 && isNaN(+arguments[1])) deletes = Array.prototype.slice.call(arguments);
  if(Array.isArray(deletes)) {
    deletes.forEach(this.deletes, this);

    return this;
  }

  if(deletes.indexOf(',') !== -1) {
    deletes = deletes.replace(' ', '').split(',');
    deletes.forEach(this.deletes, this);

    return this;
  }

  this._deletes.push(deletes);

  return this;
};

QueryBuilder.prototype.escape = function(value) {
  if('string' !== typeof value) return value;
  value = value.replace(/([\+\-&\!|\(\){}\[\]\^"~\?\s:\\])/g, "\\$1");
  value = value.replace(/(\bAND\b|\bOR\b|\bNOT\b)/gi, "\\$1");
  return value;
};
/**
 * Escape stars for Lucene Index searches.
 * @param {String} value String to escape.
 * @return {String} Escaped value.
 */
QueryBuilder.prototype.escapeStars = function(value) {
  if('string' !== typeof value) return value;
  return value.replace(/([\*])/g, "\\$1");
};

/**
 * Executes the query and gives the results back to the callback function.
 * @param {Object} params Query parameters as specified in the query string.
 * @param {Function} cb Callback function.
 * @param {Object} cb.err Error object, null if none.
 * @param {Array} cb.data Array of result objects.
 */
QueryBuilder.prototype.execute = function(params, cb) {
  var that = this;

  if(arguments.length === 1 && typeof arguments[0] === 'function') {
    cb = params;
    params = {};
  }

  return that.database.query(that.buildQuery(), params).nodeify(cb);
};

QueryBuilder.prototype.getCount = function(params, cb) {
  var that = this;

  if(arguments.length === 1 && typeof arguments[0] === 'function') {
    cb = params;
    params = {};
  }
  return new Promise(function(resolve, reject) {
    if(that._limit && that._limit.limit === 1)  return resolve([{count: 1}]);
    else if(that._returns.length === 0)         return resolve([{count: 0}]);

    resolve(that.database.query(that.buildCountQuery(), params));
  }).then(function(result) {
    return result[0].count.longValue;
  }).nodeify(cb);
};
/**
 * @chainable
 * Add limits to the query.
 * @param {Number} skip Amount of entries to skip.
 * @param {Number} limit Amount of entries to query.
 */
QueryBuilder.prototype.limit = function(skip, limit) {
  if(arguments.length === 1) {
    limit = skip;
    skip = 0;
  }

  this._limit = {skip: skip || 0, limit: limit};

  return this;
};
/**
 * @chainable
 * Add matches to the query.
 * @param {Object} match Can either be a single match or an array of it.
 */
QueryBuilder.prototype.match = function(match) {
  if(arguments.length > 1 && isNaN(+arguments[1])) match = Array.prototype.slice.call(arguments);
  if(Array.isArray(match)) {
    match.forEach(this.match, this);
    return this;
  }

  this._match.push(match);

  return this;
};
QueryBuilder.prototype.optionalMatch = function(match) {
  if(arguments.length > 1 && isNaN(+arguments[1])) match = Array.prototype.slice.call(arguments);
  if(Array.isArray(match)) {
    match.forEach(this.optionalMatch, this);
    return this;
  }

  this._optionalMatch.push(match);

  return this;
};
/**
 * @chainable
 * Add orderings to the query.
 * @param {Object} orderBy Can either be a single order by object or an array of it. The objects should contain a 'field' and optionally a 'dir' field.
    @example
    query.orderBy({
      field: 'person.name',
      dir: 'DESC'
    });
    query.orderBy([{
      field: 'person.name',
      dir: 'DESC'
    }, {
      field: 'person.age',
      dir: 'ASC'
    });
 */
QueryBuilder.prototype.orderBy = function(orderBy) {
  if(arguments.length > 1 && isNaN(+arguments[1])) orderBy = Array.prototype.slice.call(arguments);
  if(Array.isArray(orderBy)) {
    orderBy.forEach(this.orderBy, this);
    return this;
  }

  this._orderBy.push(orderBy);

  return this;
};
/**
 * Parse a parameter object and map to the according method.
 * @param {Object} params Parameter object.
 * @param {Array} params.orderBy (Optional) Order by field and direction.
 * @param {Number} params.skip (Optional) Skip this amount of results.
 * @param {Number} params.limit (Optional) Limit the result set in count to the specified value.
 */
QueryBuilder.prototype.params = function(params) {
  this._params = params;
  if(params.orderBy) this.orderBy(params.orderBy);
  if(params.limit || params.skip) this.limit(params.skip, params.limit);
};
/**
 * @chainable
 * Add return values to the query.
 * @param {Object} returns Can either be a comma separated list of identifiers or an array or just a single identifier.
 */
QueryBuilder.prototype.returns = QueryBuilder.prototype.return = function(returns) {
  if(arguments.length > 1 && isNaN(+arguments[1])) returns = Array.prototype.slice.call(arguments);
  if(Array.isArray(returns)) {
    returns.forEach(this.returns, this);
  }
  else if(returns.indexOf(',') !== -1) {
    returns.split(',').forEach(this.returns, this);
  }
  else {
    this._returns.push(returns.trim());
  }

  return this;
};
/**
 * @chainable
 * Add starting points to the query.
 *      @example
 *      query.startAt({a: 'node:Guitars("name: ESP")'});
 * @param {Object} startAt Object containing starting points.
 */
QueryBuilder.prototype.startAt = function(startAt) {
  for(var key in startAt) {
    if(startAt.hasOwnProperty(key)) this._startAt[key] = startAt[key];
  }

  return this;
};
/**
 * @chainable
 * Set properties within a query.
 *     @example
 *     query.set({'n.name': 'Homer'});
 * @param {Object} set Key-Value-Mapping of properties to set.
 */
QueryBuilder.prototype.set = function(set) {
  if(Array.isArray(set)) {
    set.forEach(this.set, this);

    return this;
  }

  this._set.push(set);

  return this;
};
QueryBuilder.prototype.union = function(queryBuilder) {
  if(queryBuilder) {
    this._union = queryBuilder;
  }
  else {
    this._union = new QueryBuilder(this.database, this._params);
  }

  return this._union;
};
/**
 * @chainable
 * Add where strings to the query.
 * @param {Object} where Can either be single identifier or an array.
 */
QueryBuilder.prototype.where = function(where) {
  if(arguments.length > 1 && isNaN(+arguments[1])) where = Array.prototype.slice.call(arguments);
  if(Array.isArray(where)) {
    where.forEach(this.where, this);

    return this;
  }

  this._where.push(where);

  return this;
};
/**
 * @chainable
 * @param {Object} Can be either a QueryBuilder instance that will put after the WITH statement or a string/array of 
 *                 return values that will be passed to the query actual query.
 * @return {QueryBuilder} A new QueryBuilder instance, pulled in as WITH in the cypher query.
 * Add WITH statement to your query.
 *     @example
 *     var query = database.buildQuery()
 *       .match('(person:Person)')
 *       .where('person.name = "Homer"')
 *       .with('person, count(person.name) as homers')
 *       .where('homers > 1')
 *       .set('person.name = "Homie"')
 *       .return('person.name');
 */
QueryBuilder.prototype.with = function(queryBuilder) {
  if(queryBuilder) {
    if(queryBuilder instanceof QueryBuilder) this._with = queryBuilder;
    else {
      this.return(queryBuilder)
      this._with = new QueryBuilder(this.database);
    }
  }
  else {
    this._with = new QueryBuilder(this.database);
  }

  return this._with;
};

module.exports = Database;