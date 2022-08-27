package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	coretypes "github.com/dagger/cloak/core"
	"github.com/dagger/cloak/engine"
	"github.com/dagger/cloak/sdk/go/dagger"
	"github.com/dagger/todoapp/workflows/deploy-3/gen/core"
	"github.com/dagger/todoapp/workflows/deploy-3/gen/netlify"
	"github.com/dagger/todoapp/workflows/deploy-3/gen/yarn"
)

func main() {
	if err := engine.Start(context.Background(), &engine.Config{}, func(ctx context.Context, _ *coretypes.Project, _ map[string]dagger.FSID) error {
		// User can configure netlify site name with $NETLIFY_SITE_NAME
		siteName, ok := os.LookupEnv("NETLIFY_SITE_NAME")
		if !ok {
			user, _ := os.LookupEnv("USER")
			siteName = fmt.Sprintf("%s-dagger-todoapp", user)
		}
		fmt.Printf("Using Netlify site name \"%s\"", siteName)

		// User must configure netlify API token with $NETLIFY_AUTH_TOKEN
		tokenCleartext, ok := os.LookupEnv("NETLIFY_AUTH_TOKEN")
		if !ok {
			return fmt.Errorf("NETLIFY_AUTH_TOKEN not set")
		}

		// Load API token into a s ecret
		var tokenSecret dagger.SecretID
		if resp, err := core.AddSecret(ctx, tokenCleartext); err != nil {
			return err
		} else {
			tokenSecret = resp.Core.AddSecret
		}

		var workdir dagger.FSID
		if resp, err := core.Workdir(ctx); err != nil {
			return err
		} else {
			workdir = resp.Host.Workdir.Read.ID
		}

		var sourceAfterBuild dagger.FSID
		if resp, err := yarn.Script(ctx, workdir, []string{"react-scripts", "build"}); err != nil {
			return err
		} else {
			sourceAfterBuild = resp.Yarn.Script.ID
		}

		var deployInfo netlify.DeployNetlifyDeploy
		if resp, err := netlify.Deploy(ctx, sourceAfterBuild, "build", siteName, tokenSecret); err != nil {
			return err
		} else {
			deployInfo = resp.Netlify.Deploy
		}

		output, err := json.Marshal(deployInfo)
		if err != nil {
			return err
		}
		fmt.Println(string(output))

		return nil
	}); err != nil {
		panic(err)
	}
}
