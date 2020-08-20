#!/bin/bash

# To initialise

# Add some test users
mongo <<DELIM

config = {_id: 'troupeSet', members: [
                         {_id: 0, host: 'localhost:27017'},
                         {_id: 1, host: 'localhost:27018'}]
};

rs.initiate(config);

DELIM
