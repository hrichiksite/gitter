function printCSV(array, columns) {
  print(columns.join(','));
  array.forEach(function(i) {
    var row = columns.map(function(column) {
      var field = i[column];
      if (field === null || field === undefined) {
        field = '';
      }
      return field;
    });

    print(row.join(','));
  });
}

function createIdForTimestampString(timestamp) {
  var hexSeconds = Math.floor(timestamp / 1000).toString(16);

  while (hexSeconds.length < 8) {
    hexSeconds = '0' + hexSeconds;
  }

  return ObjectId(hexSeconds + '0000000000000000');
}
