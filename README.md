# humanid-core

## Requirements

1. Unix Shell (Use WSL or Cygwin in Windows)
2. Node.js v12 LTS
3. MySQL 5.7
4. API Credentials
   - SMS Provider
     - Vonage (formerly Nexmo)
     - AWS SNS
   - Firebase Server Key

## Set-up

### Install Dependencies

```bash
npm install
```

### Configure

Create `config.json` file in Root Project directory by copying `config-example.json`. Below are list of available configuration:

| Key                          | Description                                     | Value                                                                                                                                | Required |
| ---------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `APP_PORT`                   | Listening Port.                                 | Number. Default: `3000`                                                                                                              |          |
| `DEBUG`                      | Debug flag                                      | Boolean. Default: `false`                                                                                                            |          |
| `BASE_PATH`                  | Base Path for URL                               | String. Default: <EMPTY_STRING>                                                                                                      |          |
| `DEMO_MODE`                  | Demo Mode for Play Store/App Store verification | Boolean. Default: `false`                                                                                                            |          |
| `HASH_ID_SALT_1`             | 1st Salt for User Hash ID generate              | String                                                                                                                               | ✓        |
| `HASH_ID_SALT_2`             | 2nd Salt for User Hash ID generate              | String                                                                                                                               | ✓        |
| `HASH_ID_REPEAT`             | Number of repeat User Hash ID generate          | Number: Default: `4`                                                                                                                 |          |
| `HASH_ID_SECRET`             | Secret for generate User Hash ID                | String                                                                                                                               | ✓        |
| `EXCHANGE_TOKEN_AES_KEY`     | Secret for encrypt/decrypt Exchange Key         | 32 bytes encoded in Hex String. Run `npm run gen-aes-key` to generate a new AES Key                                                  | ✓        |
| `EXCHANGE_TOKEN_LIFETIME`    | Exchange Token Lifetime in seconds              | Number. Default: `300`                                                                                                               |          |
| `DEV_CONSOLE_CLIENT_API_KEY` | API Key for humanID Developer Console Access    | String                                                                                                                               | ✓        |
| `DATABASE`                   | Database Conenction                             | Object. For `DATABASE` configuration, please refer to [Sequelize configuration](http://docs.sequelizejs.com/manual/getting-started). | ✓        |
| `DATABASE.dialect`           | Database Server Driver.                         | `mysql`                                                                                                                              | ✓        |
| `DATABASE.host`              | Database Server Host                            | String                                                                                                                               | ✓        |
| `DATABASE.port`              | Database Server Port                            | Number                                                                                                                               | ✓        |
| `DATABASE.username`          | Database Server Username                        | String                                                                                                                               | ✓        |
| `DATABASE.password`          | Database Server Password                        | String                                                                                                                               | ✓        |
| `DATABASE.database`          | Database Server Database Name                   | String                                                                                                                               | ✓        |
| `FIREBASE_SERVER_KEY`        | Firebase Server Key                             | String                                                                                                                               | ✓        |
| `NEXMO_API_KEY`              | Vonage API Key                                  | String                                                                                                                               | ✓        |
| `NEXMO_API_SECRET`           | Vonage API Secret                               | String                                                                                                                               | ✓        |
| `NEXMO_SENDER_ID_DEFAULT`    | Default fallback value for Vonage Sender ID     | String. Default: `humanID`                                                                                                           |          |
| `NEXMO_SENDER_ID_US`         | Sender ID for US                                | String                                                                                                                               |          |
| `NEXMO_SENDER_ID_VN`         | Sender ID for Vietnam                           | String                                                                                                                               |          |
| `AWS_SECRET_KEY_ID`          | AWS Secret Key ID                               | String                                                                                                                               | ✓        |
| `AWS_SECRET_ACCESS_KEY`      | AWS Secret Access Key                           | String                                                                                                                               | ✓        |
| `AWS_SMS_REGION`             | AWS Region                                      | String. Default: `us-west-2`                                                                                                         |          |

### Init Database

> Use MySQL server in `docker` for local development or testing environment
>
> ```bash
> # Host: localhost
> # Port: 3306 
> # Username: root
> # Password: root
>
> docker run -d --name db-mysql -p 3306:3306 \
>  -e MYSQL_ROOT_PASSWORD=root \
>  mysql:5.7
> ```

Once the server has been configured, run command below to start migration:

```bash
npm run db:refresh
```

### Generate API Documentation

```
npm run doc
```

## Development

- Start Server

  ```bash
  npm run start
  ```

## Maintenance

### Database

Database connection will use `DATABASE` in `config.json`

- Check Database Migration Status

  ```bash
  npm run db:status
  ```
  
- Update Database

  ```bash
  npm run db:migrate
  ```

- Undo to Last Migration Version

  ```bash
  npm run db:undo
  ```

- Reset Database

  > WARNING! This command will drop existing database
	
  ```bash
  npm run db:refresh
  ```

## License

Copyright 2019-2020 Bluenumber Foundation  
Licensed under the GNU General Public License v3.0 [(LICENSE)](/LICENSE)