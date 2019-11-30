(function(window){
  'use strict';
  var db;
  var debug=true;
  var jslogic=false;
  var onSuccess = function(r){
    console.log(r);
  }
  var onError = function(e){
    console.log(e);
  }
  function debugMsg(msg){
    if(debug){
      console.log(msg);
    }
  }
  function initDB(name,version,size){
    try {
      if (!window.openDatabase) {
        debugMsg("sqLava Message: Your browser does not support sqLite databases.");
        return false;
      } else {
        var maxSize = size * 1024 * 1024;
        db = openDatabase(name, version, name, maxSize);
        debugMsg("sqLava Message: "+name+' was successfully created/loaded.');
        return true;
      }
    } catch(e) {
      debugMsg("sqLava Message: An error occured while creating/loading the database, please try again. "+e);
      return false;
    }
  }
  function query(opts){
    var q=getSql(opts);
    var sql=q[0];
    var param=q[1];
    debugMsg("sqLava Executing: "+sql);
    db.transaction(
      function (transaction) {
        transaction.executeSql(sql,param, function(t,r){opts.success(r);}, function(t,e){opts.error(e.message);});
      }
    );
  }
  function multiquery(opts,success,error){
    var callback={};
    if(typeof success==="function"){
      callback.success=success;
    }
    if(typeof error==="function"){
      callback.error=error;
    }
    checkCallBacks(callback);
    if(typeof opts.length==="undefined"){
      if(typeof opts.data!=="undefined"){
        if(typeof opts.data.length==="undefined"){
          debugMsg("sqLava Error: The data entered was not an array, if you are executing a single query, use an alternative sqLava functions.");
          return false;
        }
      }else{
        debugMsg("sqLava Error: No data could be found. Please set the data parameter.");
        return false;
      }
    }
    db.transaction(
      function (transaction) {
        var errors=0;
        var emsg="";
        var sql="";
        var param=[];
        var q;
        if(typeof opts.length==="undefined"){
          opts=[opts];
        }
        var success=function(i,j){
          return function(t,r){
            if(errors==0&&i==opts.length-1&&(typeof j==="undefined"||j)){
              callback.success(r);
            }else if(i==opts.length-1&&errors>0&&(typeof j==="undefined"||j)){
              callback.error("sqLava Error: "+errors+" errors. "+emsg);
            }
          }
        }
        var multiError = function(i,j){
          return function(t,e){
            if(e.message.indexOf('23')>-1){
              debugMsg("sqLava Message: There was a system table which was not deleted.");
            }else{
              errors++;
              emsg+=" "+e.message;
            }

            if(i==opts.length-1&&(typeof j==="undefined"||j)){
              callback.error("sqLava Error: "+errors+" errors. "+emsg);
            }
          }
        }
        for(var i=0;i<opts.length;i++){
          if(typeof opts[i]==="string"){
            sql=opts[i];
            param=[];
            debugMsg("sqLava Executing: "+sql);
            transaction.executeSql(sql,param, success(i), multiError(i));
          }else if(typeof opts[i].data!=="undefined"&&typeof opts[i].data.length!=="undefined"&&opts[i].type=="update"){
            // Data is an array, need to reduce data into individual steps and run
            // Generate query
            for(var j=0;j<opts[i].data.length;j++){
              var o=cloneObject(opts[i]);
              o.data=opts[i].data[j];
              if(typeof o.where==="undefined"){
                o.where="where";
              }
              o.wherevar=o.where;
              o.where=opts[i].data[j][o.where];
              q=getSql(o);
              sql=q[0];
              param=q[1];
              debugMsg("sqLava Executing: "+sql);
              transaction.executeSql(sql,param, success(i,j==opts[i].data.length-1), multiError(i,j==opts[i].data.length-1));
            }
          }else{
            // Use info in opts only
            q=getSql(opts[i]);
            sql=q[0];
            param=q[1];
            debugMsg("sqLava Executing: "+sql);
            transaction.executeSql(sql,param, success(i), multiError(i));
          }
        }
      }
    );
  }
  function getSql(opts){
    if(typeof opts.sql==="string"){
      return [opts.sql,[]];
    }else if(typeof opts.type==="undefined"){
      debugMsg("sqLava Error: Type was not defined for automatic SQL generation. Please set a type.");
    }else if(typeof opts.table!=="string"){
      debugMsg("sqLava Error: No table name could be found. Please enter a table name as a String.");
    }else{
      var sqlr=false;
      var params=[];
      switch(opts.type){
        case "update":
        var where='';
        if(typeof opts.where!=="undefined"&&opts.where.length>0){
          where=" WHERE "+convLogic(opts.where);
        }else{
          debugMsg("sqLava Message: An update is about to be preformed with no WHERE clause.");
        }
        if(typeof opts.data!=="object"){
          debugMsg("sqLava Message: There was no data object found.");
        }else{
          var up=" ";
          for(var c in opts.data){
            if(c!=opts.wherevar){
              if(typeof opts.data[c]==="object"){
                if(opts.data[c].func){
                  up+=c+"="+opts.data[c].set+",";
                }else{
                  up+=c+"='"+opts.data[c].set+"',";
                }
              }else if(typeof opts.data[c]==="string"){
                up+=c+"='"+opts.data[c].replace(/'/g,"''")+"',";
              }else if(typeof opts.data[c]==="number"){
                up+=c+"="+opts.data[c]+",";
              }else{
                up+=c+"=null,";
              }
            }
          }
          up = up.slice(0, -1);
          sqlr="UPDATE "+opts.table+" SET "+up+where;
        }
        break;
        case "select":
        if(typeof opts.columns==="undefined"){
          opts.columns=" * ";
        }
        var cols='';
        if(typeof opts.columns==="string"){
          cols=opts.columns;
        }else{
          for(var i=0;i<opts.columns.length;i++){
            cols+=opts.columns[i]+",";
          }
          cols=cols.slice(0,-1);
        }
        var where='';
        if(typeof opts.where!=="undefined"&&opts.where.length>0){
          where=" WHERE "+convLogic(opts.where);
        }
        var extra='';
        if(typeof opts.extra!=="undefined"&&opts.extra.length>0){
          extra=" "+opts.extra;
        }
        sqlr="SELECT "+cols+" FROM "+opts.table+where+extra;
        break;
        case "insert":
        sqlr="INSERT INTO "+opts.table;
        var q=getInsert(opts);
        sqlr+=q[0];
        params=q[1];
        break;
        case "delete":
        var where="";
        if(typeof opts.where!=="undefined"&&opts.where.length>0){
          where=" WHERE "+convLogic(opts.where);
        }
        var extra='';
        if(typeof opts.extra!=="undefined"&&opts.extra.length>0){
          extra=" "+opts.extra;
        }
        sqlr="DELETE FROM "+opts.table+where+extra+";";
        break;
        case "drop":
        sqlr="DROP TABLE IF EXISTS "+opts.table+";";
        break;
        case "create":
        if(typeof opts.columns==="undefined"){
          debugMsg("sqLava Error: No columns were found. Please enter some columns. Check the API manual for more information.");
        }else{
          var cols='';
          if(typeof opts.columns==="string"){
            cols=opts.columns;
          }else if(typeof opts.columns.length==="undefined"){
            debugMsg("sqLava Error: Please enter the columns as a string with columns separated by , or as an array. Check the API manual.");
          }else{
            for(var i=0;i<opts.columns.length;i++){
              cols+=opts.columns[i]+",";
            }
            cols=cols.slice(0,-1);
          }
          sqlr="CREATE TABLE IF NOT EXISTS "+opts.table+" ("+cols+");";
        }
        break;
        default:
        debugMsg("sqLava Error: Type '"+opts.type+"' is not a valid type for automatic SQL generation. Please set a type.");
      }
      return [sqlr,params];
    }
    return false;
  }
  function getInsert(opts){
    var insert=opts.data;
    var c =getKeys(insert);

    var names=" (";
    for(var i=0;i<c.length;i++){
      names+=c[i]+",";
    }
    names = names.slice(0, -1)+") ";
    var vals=" ";
    var params=[];
    var fin=1;
    var array=false;
    var curr=insert;
    if(typeof insert.length!=="undefined"){
      array=true;
      fin=insert.length;
    }

    for(var j=0;j<fin;j++){
      vals+="(";
      if(array){
        curr=insert[j];
      }
      for(var i=0;i<c.length;i++){
        if(typeof curr[c[i]]==="object"&&typeof curr[c[i]].set!=="undefined"){
          if(curr[c[i]].func){
            vals+=curr[c[i]].set+",";
          }else{
            vals+="'"+curr[c[i]].set+"',";
          }
        }else if(typeof curr[c[i]]==="string"){
          //vals+="?,";
          //params.push(curr[c[i]]);
          vals+="'"+curr[c[i]].replace(/'/g,"''")+"',";
        }else if(typeof curr[c[i]]==="number"){
          vals+=curr[c[i]]+",";
        }else{
          vals+="null,";
        }
      }
      vals = vals.slice(0, -1)+"),";
    }
    vals = vals.slice(0, -1);
    return [" "+names+" VALUES "+vals,params];
  }
  function columns(opts){
    if(typeof opts.table==="undefined"){
      debugMsg("sqLava Error: No table was found.");
      opts.error("sqLava Error: No table was found.");
      return false;
    }
    var sql="SELECT name, sql FROM sqlite_master WHERE type='table' AND name='"+opts.table+"';"
    var tq={};
    tq.sql=sql;
    tq.success = function(r){
      if(len(r)>0){
        var columnParts = r.rows.item(0).sql.replace(/^[^\(]+\(([^\)]+)\)/g, '$1').split(',');
        var columnNames = [];
        for(var i in columnParts) {
          if(typeof columnParts[i] === 'string')
          columnNames.push(columnParts[i].split(" ")[0]);
        }
        opts.success(columnNames);
      }else{
        debugMsg("sqLava Message: The table "+opts.table+" was not found in the database.");
        opts.error("The table "+opts.table+" was not found in the database.");
      }
    };
    tq.error=opts.error;
    query(tq);
  }
  function backup(opts){
    if(typeof opts.backup==="undefined"){
      debugMsg("sqLava Error: No table name for the backup table was specified.");
      return false;
    }
    if(typeof opts.table==="undefined"){
      debugMsg("sqLava Error: No table name for the table to backup was specified.");
      return false;
    }
    var where='';
    if(typeof opts.where!=="undefined"&&opts.where.length>0){
      where=" WHERE "+convLogic(opts.where);
      console.log(where);
    }
    opts.sql="CREATE TABLE "+opts.backup+" AS SELECT * FROM "+opts.table+where;
    query(opts);
  }
  function queryAll(opts){
    var sql="SELECT tbl_name from sqlite_master WHERE type = 'table';"
    var d={};
    d.sql=sql;
    var m=[];
    d.success=function(r){
      if(len(r)>0){
        for(var i=0;i<len(r);i++){
          var where;
          if(opts.type=="delete"&&typeof opts.where!=="undefined"){
            where=opts.where;
          }
          m.push({
            type:opts.type,
            table:row(r,i).tbl_name,
            where:where
          });
        }
        multiquery(m,opts.success,opts.error);
      }else{
        debugMsg("sqLava Message: There were no tables found to remove.");
        opts.success(r);
      }
    };
    d.error=opts.error;
    query(d);
  }
  function exportCSV(opts,success,error){
    var csv = [];
    var columnData='';
    if(typeof opts ==="string"){
      if(opts.indexOf(',')>-1){
        opts=opts.split(',');
      }else{
        opts=[opts];
      }
    }else if(typeof opts[0]!=="string"){
      debugMsg("sqLava Error: opts must be a string or an array of strings.");
    }
    if(typeof success !=="function"){
      success=onSuccess;
    }
    if(typeof error !=="function"){
      error=onError;
    }
    var csvsuc = function(i){
      return function(t,r){
        if(len(r)>0){
          var csvData="";
          for (var j=0;j<len(r);j++) {
            var row = r.rows.item(j);
            var columnData="";
            if(j==0){
              for(var column in row) {
                columnData+=column+",";
              }
              columnData=columnData.slice(0,-1);
              csvData += columnData + "\n";
            }
            columnData='';
            for(var column in row) {
              var val=" "+row[column];
              val=val.replace(/,/g, "");
              columnData+=val+",";
            }
            columnData=columnData.slice(0,-1);
            csvData += columnData + "\n";
          }
          csv.push({table:opts[i],data:csvData});
          if(i==opts.length-1){
            success(csv);
          }
        }else{
          debugMsg("sqLava Message: No data was found in "+opts[i]);
        }
      }
    };
    db.transaction(function(tx){
      for(var i=0;i<opts.length;i++){
        debugMsg("sqLava Executing: SELECT * FROM "+opts[i]);
        tx.executeSql("SELECT * FROM "+opts[i], [],csvsuc(i),function(t,e){error("sqLava Error: "+e.message);});
      }
    });
  }
  function dlCSV(csv,success){
    if(typeof csv[0] ==="undefined"){
      csv=[csv];
    }
    if(typeof success !=="function"){
      success=onSuccess;
    }
    var l = document.createElement('a');
    for(var i=0;i<csv.length;i++){
      l.download = csv[i].table+'.csv';
      l.href ='data:application/webcsv;charset=utf8,' + encodeURIComponent(csv[i].data);
      l.click();
    }
    success("sqLava Success: CSV Files downloaded.");
  }
  function checkCallBacks(opts){
    if(typeof opts.success!=="function"){
      opts.success=onSuccess;
    }
    if(typeof opts.error!=="function"){
      opts.error=onError;
    }
    //console.log(opts);
  }
  function cloneObject(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    var temp = obj.constructor(); // give temp the original obj's constructor
    for (var key in obj) {
      temp[key] = cloneObject(obj[key]);
    }
    return temp;
  }
  function len(r){
    return r.rows.length;
  }
  function row(r,i){
    return r.rows.item(i);
  }
  function getKeys(p){
    var cols = [];
    if(typeof p==="undefined"){
      opts.error("sqLava Error: The rows property is not defined.");
      return;
    }else if(typeof p.length!=="undefined"){
      p = p[0];
    }
    for (var key in p) {
      cols.push(key);
    }
    return cols;
  }
  function convLogic(l,force){
    if(jslogic||force==true){
      l=l.replace("==null"," is null ");
      l=l.replace("!=null"," is not null ");
      l=l.replace("===","=");
      l=l.replace("!==","!=");
      l=l.replace("==","=");
      l=l.replace("&&"," AND ");
      l=l.replace("||"," OR ");
    }
    return l;
  }
  function bootsqLava(){
    var sqLava = {};
    // Public functions
    sqLava.initDB = function(opts){
      if(typeof opts.name==="undefined"){
        debugMsg("sqLava Error: You must enter a name for the database.");
        return opts.callback(false);
      }
      if(typeof opts.callback==="undefined"){
        debugMsg("sqLava Message: You have not entered a callback function, nothing will happen on db creation.");
        opts.callback=function(t){debugMsg("sqLava Message: Default Callback - DB Success="+t);};
      }
      if(isNaN(opts.size)){
        debugMsg("sqLava Message: You have not entered a valid database size, setting it to 20MBs.");
        opts.size=20;
      }
      if(typeof opts.debug!=="undefined"){
        debug=opts.debug;
      }
      if(typeof opts.jslogic!=="undefined"){
        jslogic=opts.jslogic;
      }
      if(typeof opts.success==="function"){
        onSuccess=opts.success;
      }
      if(typeof opts.error==="function"){
        onError=opts.error;
      }
      var v=1;
      if(!isNaN(opts.version)){
        v=opts.version;
      }
      opts.callback(initDB(opts.name,v,opts.size));
    }
    sqLava.getDB = function(){
      return db;
    }
    sqLava.create = function(opts){
      checkCallBacks(opts);
      opts.type="create";
      // Send query
      query(opts);
    }
    sqLava.sql = function(opts){
      checkCallBacks(opts);
      query(opts);
    }
    sqLava.multi = function(opts,success,error){
      multiquery(opts,success,error);
    }
    sqLava.select = function(opts){
      checkCallBacks(opts);
      opts.type="select";
      query(opts);
    }
    sqLava.update = function(opts,success,error){
      if(typeof opts=="string"){
        opts=JSON.parse(opts);
        opts.success=success;
        opts.error=error;
      }
      checkCallBacks(opts);
      opts.type="update";
      query(opts);
    }
    sqLava.insert = function(opts, success, error){

      if(typeof opts=="string"){
        opts=JSON.parse(opts);
        opts.success=success;
        opts.error=error;
      }
      if(typeof success === "function"){
        opts.success=success;
      }
      if(typeof error === "function"){
        opts.error=error;
      }
      checkCallBacks(opts);

      var m=[];

      if(opts.create!==false){
        m.push({
          type:"create",
          table:opts.table,
          columns:getKeys(opts.rows)
        });
      }
      m.push({
        type:"insert",
        table:opts.table,
        data:opts.rows
      });

      multiquery(m,opts.success,opts.error);
    }
    sqLava.delete = function(opts){
      if(typeof opts==="string"){
        opts={
          table:opts
        };
      }
      checkCallBacks(opts);
      opts.type="delete";
      query(opts);
    }
    sqLava.drop = function(opts,success,error){
      if(typeof opts==="string"||typeof opts[0]==="string"){
        var tbl=opts;
        opts=[];
        if(typeof tbl==="string"){
          if(tbl.indexOf(",")>-1){
            tbl=tbl.split(",");
          }else{
            tbl=[tbl];
          }
        }
        for(var i=0;i<tbl.length;i++){
          opts.push({table:tbl[i]});
        }
        if(opts.length==1){
          opts=opts[0];
          opts.success=success;
          opts.error=error;
        }
      }
      if(typeof opts.length==="undefined"){
        checkCallBacks(opts);
        opts.type="drop";
        query(opts);
      }else{
        for(var i=0;i<opts.length;i++){
          opts[i].type="drop";
        }
        multiquery(opts,success,error);
      }
    }
    sqLava.emptyAll = function(opts){
      if(typeof opts==="undefined"){
        opts={};
      }
      checkCallBacks(opts);
      opts.type="delete";
      queryAll(opts);
    }
    sqLava.dropAll = function(opts){
      if(typeof opts==="undefined"){
        opts={};
      }
      checkCallBacks(opts);
      opts.type="drop";
      queryAll(opts);
    }
    sqLava.getJSON = function(opts){
      if(typeof opts ==="string"){
        var tbl=opts;
        opts={};
        opts.table=tbl;
      }
      checkCallBacks(opts);
      opts.type="select";
      opts.nsuccess=opts.success;
      opts.success = function(r){
        var results={};
        results.table=opts.table;
        results.data=[];
        for(var i=0;i<len(r);i++){
          results.data.push(r.rows.item(i));
        }
        opts.nsuccess(JSON.stringify(results));
      }
      query(opts);
    }
    sqLava.getCSV = function(opts,success,error){
      exportCSV(opts,success,error);
    }
    sqLava.backup = function(opts){
      if(typeof opts==="string"){
        var t=opts;
        opts={};
        opts.table=t;
        opts.backup=t+"_backup";
      }
      checkCallBacks(opts);
      var d={};
      d.type="drop";
      d.table=opts.backup;
      d.success=function(r){
        backup(opts);
      };
      d.error=opts.error;
      query(d);
    }
    sqLava.numRows = function(opts){
      if(typeof opts==="string"){
        var t=opts;
        opts={};
        opts.table=t;
      }
      checkCallBacks(opts);
      opts.nsuccess=opts.success;
      var success=function(r){
        opts.nsuccess(len(r));
      };
      opts.success=success;
      opts.type="select";
      query(opts);
    }
    sqLava.getColumns = function(opts){
      if(typeof opts==="string"){
        var t=opts;
        opts={};
        opts.table=t;
      }
      checkCallBacks(opts);
      columns(opts);
    }
    sqLava.logic = function(l){
      return convLogic(l,true);
    }
    sqLava.cloneObj = function(obj){
      return cloneObject(obj);
    }
    sqLava.setDB = function(d){
      db=d;
    }
    sqLava.setDebug = function(d){
      if(typeof d!=="boolean"){
        debugMsg("sqLava Error: setDebug can only take booleans.");
      }else{
        debug=d;
      }
    }
    sqLava.setJSLogic = function(d){
      if(typeof d!=="boolean"){
        debugMsg("sqLava Error: setJSLogic can only take booleans.");
      }else{
        jslogic=d;
      }
    }
    sqLava.dlCSV = function(t){
      exportCSV(t,function(r){
        dlCSV(r);
      });
    }
    return sqLava;
  }
  if(typeof(sqLava) === "undefined"){
    window.sqLava = bootsqLava();
  }else{
    alert("sqLava already defined.");
  }
})(window);
