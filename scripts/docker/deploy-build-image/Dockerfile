FROM williamyeh/ansible:alpine3

# alpine-sdk to get `make`
RUN apk add --no-cache bash git alpine-sdk && pip install awscli boto --upgrade

ENV PATH $PATH:/root/.local/bin

RUN rm -rf /tmp/* /var/cache/apk/* /root/.npm /root/.node-gyp /root/.gnupg /root/.ssh 2>/dev/null
