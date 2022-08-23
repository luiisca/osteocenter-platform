<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/calcom/cal.com">
    <img src="logo.png" alt="Logo">
  </a>

  <h3 align="center">Osteocenter platform</h3>

  <p align="center">
    Patient/doctor platform for the <a href="https://osteocenter.vercel.app">Osteocenter</a> clinic.
  </p>
</p>

<!-- ABOUT THE PROJECT -->

## About The Project

<img width="100%" alt="booking-screen" src="https://user-images.githubusercontent.com/8019099/176390354-f1bc7069-0341-437a-9bb8-eb41092b4016.gif">

### Built With

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [Tailwind](https://tailwindcss.com/)
- [Prisma](https://prisma.io/)

<!-- GETTING STARTED -->

## Getting Started

To get a local copy up and running, please follow these simple steps.

### Prerequisites

Here is what you need to be able to run Cal.

- Node.js (Version: >=15.x <17)
- PostgreSQL
- Yarn _(recommended)_

> If you want to enable any of the available integrations, you may want to obtain additional credentials for each one. More details on this can be found below under the [integrations section](#integrations).

## Development

### Setup

1. Clone the repo into a public GitHub repository (or fork https://github.com/calcom/cal.com/fork). If you plan to distribute the code, keep the source code public to comply with [AGPLv3](https://github.com/calcom/cal.com/blob/main/LICENSE). To clone in a private repository, [acquire a commercial license](https://cal.com/sales))

   ```sh
   git clone https://github.com/calcom/cal.com.git
   ```

1. Go to the project folder

   ```sh
   cd cal.com
   ```

1. Install packages with yarn

   ```sh
   yarn
   ```

1. Use `openssl rand -base64 32` to generate a key and add it under `NEXTAUTH_SECRET` in the .env file.

#### Quick start with `yarn dx`

> - **Requires Docker and Docker Compose to be installed**
> - Will start a local Postgres instance with a few test users - the credentials will be logged in the console

```sh
yarn dx
```

#### Development tip

> Add `NEXT_PUBLIC_DEBUG=1` anywhere in your `.env` to get logging information for all the queries and mutations driven by **trpc**.

```sh
echo 'NEXT_PUBLIC_DEBUG=1' >> .env
```

#### Manual setup

1. Configure environment variables in the `.env` file. Replace `<user>`, `<pass>`, `<db-host>`, `<db-port>` with their applicable values

   ```
   DATABASE_URL='postgresql://<user>:<pass>@<db-host>:<db-port>'
   ```

   <details>
   <summary>If you don't know how to configure the DATABASE_URL, then follow the steps here to create a quick DB using Heroku</summary>

   1. Create a free account with [Heroku](https://www.heroku.com/).

   2. Create a new app.
      <img width="306" alt="Create an App" src="https://user-images.githubusercontent.com/16905768/115322780-b3d58c00-a17e-11eb-8a52-b758fb0ea942.png">

   3. In your new app, go to `Overview` and next to `Installed add-ons`, click `Configure Add-ons`. We need this to set up our database.
      ![image](https://user-images.githubusercontent.com/16905768/115323232-a53ba480-a17f-11eb-98db-58e2f8c52426.png)

   4. Once you clicked on `Configure Add-ons`, click on `Find more add-ons` and search for `postgres`. One of the options will be `Heroku Postgres` - click on that option.
      ![image](https://user-images.githubusercontent.com/16905768/115323126-5beb5500-a17f-11eb-8030-7380310807a9.png)

   5. Once the pop-up appears, click `Submit Order Form` - plan name should be `Hobby Dev - Free`.
      <img width="512" alt="Submit Order Form" src="https://user-images.githubusercontent.com/16905768/115323265-b4baed80-a17f-11eb-99f0-d67f019aa6df.png">

   6. Once you completed the above steps, click on your newly created `Heroku Postgres` and go to its `Settings`.
      ![image](https://user-images.githubusercontent.com/16905768/115323367-e92ea980-a17f-11eb-9ff4-dec95f2ec349.png)

   7. In `Settings`, copy your URI to your Cal.com .env file and replace the `postgresql://<user>:<pass>@<db-host>:<db-port>` with it.
      ![image](https://user-images.githubusercontent.com/16905768/115323556-4591c900-a180-11eb-9808-2f55d2aa3995.png)
      ![image](https://user-images.githubusercontent.com/16905768/115323697-7a9e1b80-a180-11eb-9f08-a742b1037f90.png)

   8. To view your DB, once you add new data in Prisma, you can use [Heroku Data Explorer](https://heroku-data-explorer.herokuapp.com/).
   </details>

1. Set a 32 character random string in your .env file for the `CALENDSO_ENCRYPTION_KEY` (You can use a command like `openssl rand -base64 24` to generate one).
1. Set up the database using the Prisma schema (found in `packages/prisma/schema.prisma`)

   ```sh
   yarn workspace @calcom/prisma db-deploy
   ```

1. Run (in development mode)

   ```sh
   yarn dev
   ```

#### Setting up your first user

1. Open [Prisma Studio](https://www.prisma.io/studio) to look at or modify the database content:

   ```sh
   yarn db-studio
   ```

1. Click on the `User` model to add a new user record.
1. Fill out the fields `email`, `username`, `password`, and set `metadata` to empty `{}` (remembering to encrypt your password with [BCrypt](https://bcrypt-generator.com/)) and click `Save 1 Record` to create your first user.
   > New users are set on a `TRIAL` plan by default. You might want to adjust this behavior to your needs in the `packages/prisma/schema.prisma` file.
1. Open a browser to [http://localhost:3000](http://localhost:3000) and login with your just created, first user.

### E2E-Testing

Be sure to set the environment variable `NEXTAUTH_URL` to the correct value. If you are running locally, as the documentation within `.env.example` mentions, the value should be `http://localhost:3000`.

```sh
# In a terminal just run:
yarn test-e2e

# To open last HTML report run:
yarn workspace @calcom/web playwright-report
```

### Upgrading from earlier versions

1. Pull the current version:

   ```sh
   git pull
   ```

1. Check if dependencies got added/updated/removed

   ```sh
   yarn
   ```

1. Apply database migrations by running <b>one of</b> the following commands:

   In a development environment, run:

   ```sh
   yarn workspace @calcom/prisma db-migrate
   ```

   (this can clear your development database in some cases)

   In a production environment, run:

   ```sh
   yarn workspace @calcom/prisma db-deploy
   ```

1. Check for `.env` variables changes

   ```sh
   yarn predev
   ```

1. Start the server. In a development environment, just do:

   ```sh
   yarn dev
   ```

   For a production build, run for example:

   ```sh
   yarn build
   yarn start
   ```

1. Enjoy the new version.

## Integrations

### Obtaining the Google API Credentials

1. Open [Google API Console](https://console.cloud.google.com/apis/dashboard). If you don't have a project in your Google Cloud subscription, you'll need to create one before proceeding further. Under Dashboard pane, select Enable APIS and Services.
2. In the search box, type calendar and select the Google Calendar API search result.
3. Enable the selected API.
4. Next, go to the [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) from the side pane. Select the app type (Internal or External) and enter the basic app details on the first page.
5. In the second page on Scopes, select Add or Remove Scopes. Search for Calendar.event and select the scope with scope value `.../auth/calendar.events`, `.../auth/calendar.readonly` and select Update.
6. In the third page (Test Users), add the Google account(s) you'll using. Make sure the details are correct on the last page of the wizard and your consent screen will be configured.
7. Now select [Credentials](https://console.cloud.google.com/apis/credentials) from the side pane and then select Create Credentials. Select the OAuth Client ID option.
8. Select Web Application as the Application Type.
9. Under Authorized redirect URI's, select Add URI and then add the URI `<Cal.com URL>/api/integrations/googlecalendar/callback` replacing Cal.com URL with the URI at which your application runs.
10. The key will be created and you will be redirected back to the Credentials page. Select the newly generated client ID under OAuth 2.0 Client IDs.
11. Select Download JSON. Copy the contents of this file and paste the entire JSON string in the .env file as the value for GOOGLE_API_CREDENTIALS key.

#### _Adding google calendar to Cal.com App Store_

After adding Google credentials, you can now Google Calendar App to the app store.
You can repopulate the App store by running

```
cd packages/prisma
yarn seed-app-store
```

You will need to complete a few more steps to activate Google Calendar App.
Make sure to complete section "Obtaining the Google API Credentials". After the do the
following

1. Add extra redirect URL `<Cal.com URL>/api/auth/callback/google`
1. Under 'OAuth concent screen', click "PUBLISH APP"

### Obtaining Microsoft Graph Client ID and Secret

1. Open [Azure App Registration](https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps) and select New registration
2. Name your application
3. Set **Who can use this application or access this API?** to **Accounts in any organizational directory (Any Azure AD directory - Multitenant)**
4. Set the **Web** redirect URI to `<Cal.com URL>/api/integrations/office365calendar/callback` replacing Cal.com URL with the URI at which your application runs.
5. Use **Application (client) ID** as the **MS_GRAPH_CLIENT_ID** attribute value in .env
6. Click **Certificates & secrets** create a new client secret and use the value as the **MS_GRAPH_CLIENT_SECRET** attribute

### Obtaining Slack Client ID and Secret and Signing Secret

To test this you will need to create a Slack app for yourself on [their apps website](https://api.slack.com/apps).

Copy and paste the app manifest below into the setting on your slack app. Be sure to replace `YOUR_DOMAIN` with your own domain or your proxy host if you're testing locally.

<details>
  <summary>App Manifest</summary>
  
 ```yaml
 display_information:
  name: Cal.com Slack
features:
  bot_user:
    display_name: Cal.com Slack
    always_online: false
  slash_commands:
    - command: /create-event
      url: https://YOUR_DOMAIN/api/integrations/slackmessaging/commandHandler
      description: Create an event within Cal!
      should_escape: false
    - command: /today
      url: https://YOUR_DOMAIN/api/integrations/slackmessaging/commandHandler
      description: View all your bookings for today
      should_escape: false
oauth_config:
  redirect_urls:
    - https://YOUR_DOMAIN/api/integrations/slackmessaging/callback
  scopes:
    bot:
      - chat:write
      - commands
      - chat:write.public 
settings:
  interactivity:
    is_enabled: true
    request_url: https://YOUR_DOMAIN/api/integrations/slackmessaging/interactiveHandler
    message_menu_options_url: https://YOUR_DOMAIN/api/integrations/slackmessaging/interactiveHandler
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

</details>

Add the integration as normal - slack app - add. Follow the oauth flow to add it to a server.

Next make sure you have your app running `yarn dx`. Then in the slack chat type one of these commands: `/create-event` or `/today`

> NOTE: Next you will need to setup a proxy server like [ngrok](https://ngrok.com/) to allow your local host machine to be hosted on a public https server.

### Obtaining Zoom Client ID and Secret

1. Open [Zoom Marketplace](https://marketplace.zoom.us/) and sign in with your Zoom account.
2. On the upper right, click "Develop" => "Build App".
3. On "OAuth", select "Create".
4. Name your App.
5. Choose "User-managed app" as the app type.
6. De-select the option to publish the app on the Zoom App Marketplace.
7. Click "Create".
8. Now copy the Client ID and Client Secret to your .env file into the `ZOOM_CLIENT_ID` and `ZOOM_CLIENT_SECRET` fields.
9. Set the Redirect URL for OAuth `<Cal.com URL>/api/integrations/zoomvideo/callback` replacing Cal.com URL with the URI at which your application runs.
10. Also add the redirect URL given above as a allow list URL and enable "Subdomain check". Make sure, it says "saved" below the form.
11. You don't need to provide basic information about your app. Instead click at "Scopes" and then at "+ Add Scopes". On the left, click the category "Meeting" and check the scope `meeting:write`.
12. Click "Done".
13. You're good to go. Now you can easily add your Zoom integration in the Cal.com settings.

### Obtaining Daily API Credentials

1. Open [Daily](https://www.daily.co/) and sign into your account.
2. From within your dashboard, go to the [developers](https://dashboard.daily.co/developers) tab.
3. Copy your API key.
4. Now paste the API key to your .env file into the `DAILY_API_KEY` field in your .env file.
5. If you have the [Daily Scale Plan](https://www.daily.co/pricing) set the `DAILY_SCALE_PLAN` variable to `true` in order to use features like video recording.

### Obtaining HubSpot Client ID and Secret

1. Open [HubSpot Developer](https://developer.hubspot.com/) and sign into your account, or create a new one.
2. From within the home of the Developer account page, go to "Manage apps".
3. Click "Create app" button top right.
4. Fill in any information you want in the "App info" tab
5. Go to tab "Auth"
6. Now copy the Client ID and Client Secret to your .env file into the `HUBSPOT_CLIENT_ID` and `HUBSPOT_CLIENT_SECRET` fields.
7. Set the Redirect URL for OAuth `<Cal.com URL>/api/integrations/hubspotothercalendar/callback` replacing Cal.com URL with the URI at which your application runs.
8. In the "Scopes" section at the bottom of the page, make sure you select "Read" and "Write" for scope called `crm.objects.contacts`
9. Click the "Save" button at the bottom footer.
10. You're good to go. Now you can see any booking in Cal.com created as a meeting in HubSpot for your contacts.

### Obtaining Vital API Keys

1. Open [Vital](https://tryvital.io/) and click Get API Keys.
1. Create a team with the team name you desire
1. Head to the configuration section on the sidebar of the dashboard
1. Click on API keys and you'll find your sandbox `api_key`.
1. Copy your `api_key` to `VITAL_API_KEY` in the .env.appStore file.
1. Open [Vital Webhooks](https://app.tryvital.io/team/{team_id}/webhooks) and add `<CALCOM BASE URL>/api/integrations/vital/webhook` as webhook for connected applications.
1. Select all events for the webhook you interested, e.g. `sleep_created`
1. Copy the webhook secret (`sec...`) to `VITAL_WEBHOOK_SECRET` in the .env.appStore file.

## Workflows

### Setting up SendGrid for Email reminders

1. Create a SendGrid account (https://signup.sendgrid.com/)
2. Go to Settings -> API keys and create an API key
3. Copy API key to your .env file into the SENDGRID_API_KEY field
4. Go to Settings -> Sender Authentication and verify a single sender
5. Copy the verified E-Mail to your .env file into the SENDGRID_EMAIL field

### Setting up Twilio for SMS reminders

1. Create a Twilio account (https://www.twilio.com/try-twilio)
2. Click ‘Get a Twilio phone number’
3. Copy Account SID to your .env file into the TWILIO_SID field
4. Copy Auth Token to your .env file into the TWILIO_TOKEN field
5. Create a messaging service (Develop -> Messaging -> Services)
6. Choose any name for the messaging service
7. Click 'Add Senders'
8. Choose phone number as sender type
9. Add the listed phone number
10. Leave all other fields as they are
11. Complete setup and click ‘View my new Messaging Service’
12. Copy Messaging Service SID to your .env file into the TWILIO_MESSAGING_SID field

<!-- LICENSE -->

## License

Distributed under the AGPLv3 License. See `LICENSE` for more information.
