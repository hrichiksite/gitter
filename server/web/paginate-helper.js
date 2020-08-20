'use strict';

function requiredBlock(context, page, pageCount, fn) {
  if (page > 1 || pageCount > 1) {
    return fn(context);
  } else {
    return '';
  }
}

function middleBlock(page, pageCount, limit, fn) {
  function contextForItem(pageNumber) {
    return {
      n: pageNumber,
      active: pageNumber === page
    };
  }

  var i;
  var ret = '';
  if (typeof limit === 'number') {
    i = 0;
    var leftCount = Math.ceil(limit / 2) - 1;
    var rightCount = limit - leftCount - 1;
    if (page + rightCount > pageCount) leftCount = limit - (pageCount - page) - 1;
    if (page - leftCount < 1) leftCount = page - 1;
    var start = page - leftCount;

    while (i < limit && i < pageCount) {
      ret = ret + fn(contextForItem(start));
      start++;
      i++;
    }
  } else {
    for (i = 1; i <= pageCount; i++) {
      ret = ret + fn(contextForItem(i));
    }
  }

  return ret;
}

function previousBlock(page, pageCount, fn) {
  if (page === 1) {
    return fn({ disabled: true, n: 1 });
  } else {
    return fn({ n: page - 1 });
  }
}

function nextBlock(page, pageCount, fn) {
  if (page === pageCount) {
    return fn({ disabled: true, n: pageCount });
  } else {
    return fn({ n: page + 1 });
  }
}

function firstBlock(page, pageCount, fn) {
  if (page === 1) {
    return fn({ disabled: true, n: 1 });
  } else {
    return fn({ n: 1 });
  }
}

function lastBlock(page, pageCount, fn) {
  if (page === pageCount) {
    return fn({ disabled: true, n: pageCount });
  } else {
    return fn({ n: pageCount });
  }
}

module.exports = function(pagination, options) {
  var type = options.hash.type || 'middle';

  var pageCount = Number(pagination.pageCount);
  var page = Number(pagination.page);
  var limit;
  if (options.hash.limit) limit = +options.hash.limit;
  var fn = options.fn;

  switch (type) {
    case 'required':
      return requiredBlock(this, page, pageCount, fn);

    case 'middle':
      return middleBlock(page, pageCount, limit, fn);

    case 'previous':
      return previousBlock(page, pageCount, fn);

    case 'next':
      return nextBlock(page, pageCount, fn);

    case 'first':
      return firstBlock(page, pageCount, fn);

    case 'last':
      return lastBlock(page, pageCount, fn);
  }

  return '';
};
