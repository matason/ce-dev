import {IConfig} from '@oclif/config'
import {execSync} from 'child_process'

import ComposeConfigBare from './compose-config-bare-interface'

const fs = require('fs')
const fspath = require('path')
const yaml = require('js-yaml')

export default class CeDevControllerManager {
  /**
   * @var
   * Docker executable path.
   */
  private readonly dockerBin: string = 'docker'
  /**
   * @var
   * Docker-compose executable path.
   */
  private readonly dockerComposeBin: string = 'docker-compose'
  /**
   * @var
   * Config from oclif.
   */
  private readonly config: IConfig
  /**
   * @var
   * Compose file path for our network definition.
   */
  private readonly networkComposeFile: string
  /**
   * @var
   * Compose file path for our controller definition.
   */
  private readonly controllerComposeFile: string

  public constructor(dockerBin: string, dockerComposeBin: string, config: IConfig) {
    this.dockerBin = dockerBin
    this.dockerComposeBin = dockerComposeBin
    this.config = config
    this.controllerComposeFile = fspath.join(this.config.dataDir, 'docker-compose.controller.yml')
    this.networkComposeFile = fspath.join(this.config.dataDir, 'docker-compose.network.yml')
  }
  /**
   * Check if our network is up and running.
   */
  public networkExists() {
    let existing = execSync(this.dockerBin + ' network ls | grep -w ce_dev | wc -l').toString().trim()
    if (existing === '0') {
      return false
    }
    return true
  }
  /**
   * Start our network.
   */
  public networkStart() {
    this.writeYaml(this.networkComposeFile, this.getNetworkConfig())
    execSync(this.dockerBin + ' network create ce_dev --attachable', {cwd: this.config.dataDir, stdio: 'inherit'})
    execSync(this.dockerComposeBin + ' -f ' + this.networkComposeFile + ' -p ce_dev up -d', {cwd: this.config.dataDir, stdio: 'inherit'})
  }
  /**
   * Check if our controller is up and running.
   */
  public controllerExists() {
    let existing = execSync(this.dockerBin + ' ps | grep -w ce_dev_controller | wc -l').toString().trim()
    if (existing === '0') {
      return false
    }
    return true
  }
  /**
   * Start our controller.
   */
  public controllerStart() {
    this.writeYaml(this.controllerComposeFile, this.getControllerConfig())
    execSync(this.dockerComposeBin + ' -f ' + this.controllerComposeFile + ' -p ce_dev_controller up -d', {cwd: this.config.dataDir, stdio: 'inherit'})
    let uid = 1000
    let gid = 1000
    if (this.config.platform === 'linux') {
      uid = process.getuid()
      gid = process.getgid()
    }
    execSync(this.dockerBin + ' exec ce_dev_controller /bin/sh /opt/ce-dev-ownership.sh ' + uid.toString() + ' ' + gid.toString(), {stdio: 'inherit'})
    execSync(this.dockerBin + ' exec ce_dev_controller /bin/sh /opt/ce-dev-ssh.sh')
  }
  /**
   * Stop our controller.
   */
  public controllerStop() {
    let existing = execSync(this.dockerBin + ' ps | grep -w ce_dev_controller | wc -l').toString().trim()
    if (existing !== '0') {
      execSync(this.dockerBin + ' stop ce_dev_controller')
    }
  }
  /**
   * Pull our controller image.
   */
  public pullImage() {
    execSync(this.dockerBin + ' pull codeenigma/ce-dev-controller-1.x:latest', {stdio: 'inherit'})
  }

  /**
   * Dump structure as YAML to a file.
   * @param file
   * Path to a file to write to
   * @param data
   * Data to write to.
   */
  private writeYaml(file: string, data: any) {
    let content = yaml.safeDump(data, {lineWidth: 1000})
    fs.writeFileSync(file.trim(), content)
  }

  private getControllerConfig(): ComposeConfigBare {
    return {
      version: '3.7',
      services: {
        ce_dev_controller: {
          container_name: 'ce_dev_controller',
          image: 'codeenigma/ce-dev-controller-1.x:latest',
          hostname: 'ce_dev_controller',
          networks: {
            ce_dev: {}
          },
          volumes: [
            'ce_dev_ssh:/home/ce-dev/.ssh',
            '/sys/fs/cgroup:/sys/fs/cgroup:ro',
            this.config.cacheDir + ':/home/ce-dev/.ce-dev-cache'
          ],
        }
      },
      networks: {
        ce_dev: {
          external: true
        }
      },
      volumes: {
        ce_dev_ssh: {
          name: 'ce_dev_ssh'
        },
        ce_dev_apt_cache: {
          name: 'ce_dev_apt_cache'
        },
        ce_dev_composer_cache: {
          name: 'ce_dev_composer_cache'
        },
        ce_dev_nvm_node: {
          name: 'ce_dev_nvm_node'
        }
      }
    }
  }

  private getNetworkConfig(): ComposeConfigBare {
    return {
      version: '3.7',
      networks: {
        ce_dev: {
          name: 'ce_dev',
          driver: 'bridge'
        }
      }
    }
  }
}
