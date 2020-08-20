'use strict';

class UserGroupFavouritesStrategy {
  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      favs: item.favs
    };
  }
}

module.exports = UserGroupFavouritesStrategy;
