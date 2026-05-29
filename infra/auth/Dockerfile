FROM ghcr.io/zitadel/zitadel:v4.13.0

EXPOSE 8080

# CapRover terminates TLS; ZITADEL_MASTERKEY and DSN come from env.
CMD ["start-from-init", "--masterkeyFromEnv", "--tlsMode", "disabled"]
