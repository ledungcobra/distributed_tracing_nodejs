[Link to the Mindmap introduction for this project](https://xmind.ai/l6tCro4m)

## Gafana Dashboard

[Link to the Gafana Dashboard for this project](http://localhost:5000)

## Stress test

```bash
autocannon -c 1000 http://localhost:4000/send/test
```

Import the postman collection to test the API
[Link to the Postman collection](./Otel.postman_collection.json)

# Important

Rename .env.example to .env and fill in the credentials for the email service

Replace all the ${VARIABLE} in the alertmanager.yml file with the actual values

```yaml
global:
  smtp_smarthost: ${SMTP_HOST}
  smtp_from: ${SMTP_FROM_ADDRESS}
  smtp_auth_username: ${SMTP_USER}
  smtp_auth_password: ${SMTP_PASSWORD}

route:
  receiver: "email-alerts"

receivers:
  - name: "email-alerts"
    email_configs:
      - to: ${PRIMARY_RECIPIENT}
        send_resolved: true
```
