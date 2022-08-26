package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	coretypes "github.com/dagger/cloak/core"
	"github.com/dagger/cloak/engine"
	"github.com/dagger/cloak/sdk/go/dagger"
	"github.com/dagger/todoapp/workflows/deploy/gen/core"
	"github.com/dagger/todoapp/workflows/deploy/gen/netlify"
	"github.com/dagger/todoapp/workflows/deploy/gen/yarn"
)

func main() {
	if err := engine.Start(context.Background(), &engine.Config{}, func(ctx context.Context, _ *coretypes.Project, _ map[string]dagger.FSID) error {
		token, ok := os.LookupEnv("NETLIFY_AUTH_TOKEN")
		if !ok {
			return fmt.Errorf("NETLIFY_AUTH_TOKEN not set")
		}
		addSecretResp, err := core.AddSecret(ctx, token)
		if err != nil {
			return err
		}

		workdirResp, err := core.Workdir(ctx)
		if err != nil {
			return err
		}

		yarnResp, err := yarn.Script(ctx, workdirResp.Host.Workdir.Read.ID, []string{"react-scripts", "build"})
		if err != nil {
			return err
		}

		netlifyResp, err := netlify.Deploy(ctx, yarnResp.Yarn.Script.ID, "build", "sam-cloak-test-demo", addSecretResp.Core.AddSecret)
		if err != nil {
			return err
		}

		output, err := json.Marshal(netlifyResp)
		if err != nil {
			return err
		}
		fmt.Println(string(output))

		return nil
	}); err != nil {
		panic(err)
	}
}
