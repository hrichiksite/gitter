FROM mongo:3.2

COPY scripts /scripts/

RUN mkdir -p /data/db2 \
    && chown -R mongodb:mongodb /data/db2

RUN mongod --fork --logpath /var/log/mongodb.log --dbpath /data/db2 --smallfiles --replSet troupeSet --journal --storageEngine=wiredTiger --directoryperdb \
    # Wait until MongoDB logs that it's ready (or timeout after 60s)
    && until mongo --eval "print(\"waited for connection\")"; do sleep 2; done \
    # Continue MongoDB setup
    && mongo admin /scripts/00_rs_init.js \
    && mongo gitter /scripts/01_init_db.js \
    && mongod --shutdown --dbpath /data/db2 \
    && chown -R mongodb /data/db2

# Make the new dir a VOLUME to persists it
VOLUME /data/db2

CMD ["mongod", "--dbpath", "/data/db2", "--smallfiles", "--replSet", "troupeSet", "--journal", "--storageEngine=wiredTiger", "--directoryperdb"]
