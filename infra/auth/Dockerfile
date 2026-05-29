FROM svhd/logto:1.40.1

ENV TRUST_PROXY_HEADER=1

EXPOSE 3001 3002

ENTRYPOINT ["sh", "-c"]
CMD ["npm run cli db seed -- --swe && CI=true npm run alteration deploy latest && cd packages/core && NODE_ENV=production node ."]
