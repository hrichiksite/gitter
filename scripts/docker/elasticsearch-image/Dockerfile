FROM elasticsearch:1.4.2

COPY languages /languages/
COPY mappings /mappings/
COPY scripts /scripts/
COPY 01-create-index-with-mapping /01-create-index-with-mapping
COPY 02-create-rivers /02-create-rivers
COPY 03-setup-alias /03-setup-alias
COPY logging.yml /usr/share/elasticsearch/config/
COPY elasticsearch.yml /usr/share/elasticsearch/config/
COPY setup-elasticsearch.sh /setup-elasticsearch.sh
COPY transform-alias-to-switch /transform-alias-to-switch
COPY vars /vars

RUN mkdir -p /data/es/logs /data/es/data /data/es/plugins

RUN /usr/share/elasticsearch/bin/elasticsearch -d -p /tmp/elasticsearch-pid \
    && sleep 2 \
    && /usr/share/elasticsearch/bin/plugin --install elasticsearch/elasticsearch-mapper-attachments/2.5.0 \
    && /usr/share/elasticsearch/bin/plugin --install com.github.richardwilly98.elasticsearch/elasticsearch-river-mongodb/2.0.9 \
    && /usr/share/elasticsearch/bin/plugin --install mobz/elasticsearch-head \
    && /usr/share/elasticsearch/bin/plugin --install royrusso/elasticsearch-HQ \
    && ./setup-elasticsearch.sh \
    && kill -15 $(cat /tmp/elasticsearch-pid) \
    && sleep 5

# Make the new dir a VOLUME to persists it
VOLUME /data/es

EXPOSE 9200
EXPOSE 9300

CMD ["/bin/bash", "-c", "mkdir -p /data/es/logs/ && /usr/share/elasticsearch/bin/elasticsearch 2>&1 | tee /data/es/logs/es-command-output.log"]
