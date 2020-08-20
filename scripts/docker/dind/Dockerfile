FROM docker

RUN apk add --no-cache py-pip
RUN pip install docker-compose

RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp /root/.gnupg /root/.ssh 2>/dev/null
