## Deploying

To deploy a frontend + api environment, follow these steps:

* Install [Mage](https://magefile.org) and project Cloak by [Dagger](https://dagger.io). Note this requires early access for now.
* From this directory run `mage -w .. deploy`
* You can customize the name of your netlify site by exporting $NETLIFY_SITE_NAME
