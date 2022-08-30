import { client, DaggerServer, gql, SecretID, FSID } from "@dagger.io/dagger";

const resolvers = {
  TodoApp: {
    deploy: async (args: { source: FSID, siteName: String, token: SecretID }) => {
      const url = await client
        .request(
          gql`
            query ($source: FSID!, $siteName: String!, $token: SecretID!) {
              core {
                filesystem(id: $source) {
                  yarn(runArgs: ["build"]) {
                    netlifyDeploy(
                      subdir: "build"
                      siteName: $siteName
                      token: $token
                    ) {
                      url
                    }
                  }
                }
              }
            }
          `,
          {
            source: args.source,
            siteName: args.siteName,
            token: args.token,
          }
        )
        .then((result: any) => result.core.filesystem.yarn.netlifyDeploy.url);
      return url;
    },
  },
};

const server = new DaggerServer({
  resolvers,
});

server.run();
