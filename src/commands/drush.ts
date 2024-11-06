import { Args, ux } from '@oclif/core'
import BaseCmd from '../abstracts/base-cmd-abstract.js'
import fs from 'node:fs'
import {execSync} from "node:child_process";
import inquirer from "inquirer";
import {type} from "node:os";

export default class DrushCmd extends BaseCmd {
  static args = {
    command: Args.string({
      description: 'Drush command to execute',
      name: 'command',
      required: true
    })
  }

  static strict = false

  static description = 'Run drush in the container'

  static examples = [
    '$ ce-dev drush st',
  ]

  async run(): Promise<void> {
    const command = this.argv.join(' ')
    let container: string | null = null

    // Read the drupal folder from deploy.yml file.
    if (!this.activeProjectInfo.deploy || (this.activeProjectInfo.deploy.length === 0)) {
      this.error('No deploy.yml file configured.')
      this.exit(1)
    }

    const deployFile = this.activeProjectInfo.deploy[0]
    if (!fs.existsSync(deployFile)) {
      this.error('No deploy.yml file found.')
      this.exit(1)
    }

    const deploy = this.parseYaml(deployFile)
    if (deploy instanceof Array) {
      if (deploy[0]['vars']) {
        const vars = deploy[0]['vars'];
        const projectType = vars.find((item: any) => item.project_type)?.project_type
        if (!projectType || (projectType != 'drupal8')) {
          this.log('The project_type parameter is empty or it is not Drupal >= 8')
          this.exit(1)
        }

        const deployPath = vars.find((item: any) => item.deploy_path)?.deploy_path
        if (!deployPath) {
          this.error('The deploy_path parameter is empty or it does not exists')
          this.exit(1)
        }

        /**
         * Drush is configured to use the vendor or use the var drush_bin.
         *
         * By default, we assume the vendor
         */
        let drushCmd = deployPath + '/vendor/drush/drush/drush' + ' ' + command
        const drushConfig = vars.find((item: any) => item.drush)?.drush
        if (!drushConfig || !drushConfig['use_vendor']) {
          this.warn('The parameter drush.user_vendor was not found or it is false, using drush_bin...')
          const drushBin = vars.find((item: any) => item.drush_bin)?.drush_bin
          if (!drushBin) {
            this.error('The parameter drush_bin was not found')
            this.exit(1)
          }

          drushCmd = drushBin + ' ' + command
        }

        // Retrieve container.
        const containers = this.getProjectRunningContainersCeDev()
        if (containers.length === 0) {
          this.warn('No running containers can be targetted. Exiting.')
          this.exit(1)
        }

        // Single container, just use this.
        if (containers.length === 1) {
          container = containers[0]
        }
        else {
          const response = await inquirer.prompt([{
            choices: containers,
            message: 'Select a container to target',
            name: 'container',
            type: 'list',
          }])

          container = response.container
        }

        const cmd = this.dockerBin + ' exec -it -u ce-dev -w ' + deployPath + ' ' + container + ' ' + drushCmd + ' || exit 0'
        // Execute docker command.
        execSync(cmd, {stdio: 'inherit'})
      }
    }
  }
}
