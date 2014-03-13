'use strict';

var Promise = require( 'promise' ),
    JavaMapper = require( './JavaMapper' )

function Service( java ) {
  var that = this;
  if( java ) {
    Object.keys( java.constructor.prototype ).forEach(function( key ) {
      if( typeof java.constructor.prototype[ key ] === 'function' && key.indexOf( 'Sync' ) === -1 ) {
        that[ key ] = function() {
          var args = Array.prototype.slice.call( arguments )
          return new Promise( function( resolve, reject ) {
            args.push( function( err, results ) {
              if( err ) reject( JavaMapper.getError( err ) )
              else resolve( JavaMapper.map( results ) )
            })
            java[ key ].apply( java, args )
          })
        }
      }
    })
  }
}

module.exports = Service