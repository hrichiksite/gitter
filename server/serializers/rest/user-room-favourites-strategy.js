'use strict';

class UserRoomFavouritesStrategy {
  preload() {}

  map(item) {
    return {
      id: item.id || item._id,
      userId: item.userId,
      favs: item.favs
    };
  }
}

module.exports = UserRoomFavouritesStrategy;
