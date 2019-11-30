// This document shows examples of sqLava

// Database creation

// sqLava.initDB
// This function creates a sqlite database
sqLava.initDB({
	name:'myDatabase',
	version:1,
	size:25,
	callback:function(r){console.log(r);},
	debug:true,
	jslogic:false
});
// debug 
// jsLogic

// Set the sqLava database as a global variable
var db=sqLava.getDB();

// Create a table with sqLava
// With comma delimited columns
sqLava.create({
	table:'myTable',
	columns:"column1,column2",
	success:function(r){alert("Success! "+r)},
	error:function(r){alert("Error! "+r)}
});

// With an array of columns
sqLava.create({
	table:'arrayTable',
	columns:["column1","column2"],
	success:function(r){alert("Success! "+r)},
	error:function(r){alert("Error! "+r)}
});

// Inserting into one table 
sqLava.insert({
	table:'myTable',
	"rows":[
		  {
			"column1": "FirstRow",
			"column2": "SecondColumn"
		  },
		  {
			"column1": "FirstColumn",
			"column2": {
				set:"date()",
				func:true
			}
		  }
		]
	,
	success:function(r){console.log(r)},
	error:function(r){console.log(r)}
});
// You can also add a property called create which is a boolean if you want to attempt to create the table 

// Insert JSON into the table
var j = '{"table":"myTable","rows":[{"column1": "FirstRow","column2": "SecondColumn"},{"column1": "FirstColumn","column2": "SecondRow"}]}';
sqLava.insert(j);

// Insert JSON into new table
var j = '{"table":"myTable2","rows":[{"column1": "FirstRow","column2": "SecondColumn"}]}';
sqLava.insert(j);


// Inserting data into multiple tables 
sqLava.multi([
{
	type:"insert",
	table:"myTable",
	data:[{column1:"insert1",column2:"insert2"}]

},
{
	type:"insert",
	table:"myTable2",
	data:[{column1:"insert1",column2:"insert2"}]
}
])

// Selecting data
sqLava.select({
	table:"myTable",
	where:"column1='insert1' AND column2='insert2'",
	extra: "ORDER BY column1 ASC",
	success:function(r){console.log(r)},
	error:function(r){console.log(r)}
});

// With jsLogic enabled
sqLava.select({
	table:"myTable",
	where:"column1='insert1' && column2='insert2'",
	success:function(r){console.log(r)},
	error:function(r){console.log(r)}
});


// Custom query
sqLava.sql({
	sql:"select * from myTable",
	success:function(r){console.log(r)},
	error:function(r){console.log(r)}
});

// Updating data
sqLava.update({
	table:"myTable",
	where:"column1='insert1'",
	data:{
		column1:"updated",
		column2:{
			set: "date()",
			func:true
		},
	},
	success:function(r){console.log(r)},
	error:function(r){console.log(r)}
});

// Updating data with JSON 
sqLava.update('{"table":"myTable","where":"column1=\'insert1\'","data":{"column1":"updated"}}');

// Deleting all rows from a table with a condition
sqLava.delete({
	table:"myTable",
	where:"column1='updated'",
	success:function(r){console.log(r)},
	error:function(r){console.log(r)}
});

// Deleting all rows from a table 
sqLava.delete("myTable2");


// Multiple queries
sqLava.multi([
{
	type:"insert",
	table:"myTable",
	data:[{column1:"insert1",column2:"insert2"}]

},
{
	type:"delete",
	table:"myTable",
	where:"column1='insert1'",
}
])

// Getting JSON String
sqLava.getJSON('myTable')

// Getting CSV
sqLava.getCSV('myTable')

// Download CSV
sqLava.dlCSV('myTable')

// backup a table 
sqLava.backup('myTable')

// num rows 
sqLava.numRows('myTable')

// columns 
sqLava.getColumns('myTable')

