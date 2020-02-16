import {flags} from '@oclif/command'
import {execSync} from 'child_process'
import * as inquirer from 'inquirer'

import BaseCmd from '../base-cmd-abstract'

const fs = require('fs')
const fspath = require('path')

export default class CreateCmd extends BaseCmd {
  static description = 'Generates a new project from a template'
  static examples = [
    '$ ce-dev create --template drupal8 --project myproject',
  ]
  static flags = {
    help: flags.help({char: 'h'}),
    template: flags.string({
      char: 't',
      description: 'Name of a template: "drupal8"'
    }),
    project: flags.string({
      char: 'p',
      description: 'A unique name for your project. Because it is used in various places (db names, url, etc), stick with lowercase alphanumeric chars.'
    }),
    destination: flags.string({
      char: 'd',
      description: 'Path to the project destination.'
    })
  }
  /**
   * @var
   * Template dir.
   */
  private readonly templatesDir: string = fspath.join(this.config.root, 'templates')
  /**
   * @var
   * Template name.
   */
  private templateName = ''
  /**
   * @var
   * Project name.
   */
  private projectName = ''
  /**
   * @var
   * Destination.
   */
  private destination = ''

  /**
   * @inheritdoc
   */
  public constructor(argv: string[], config: any) {
    super(argv, config)
  }
  /**
   * @inheritdoc
   */
  async run() {
    const {flags} = this.parse(CreateCmd)
    let project = flags.project
    if (!project) {
      let response: any = await inquirer.prompt([{
        name: 'project',
        message: 'Name for the project',
        type: 'input'
      }])
      project = response.project
    }
    this.projectName = project as string
    let template = flags.template
    if (!template) {
      let response: any = await inquirer.prompt([{
        name: 'template',
        message: 'Template',
        type: 'list',
        choices: ['drupal8']
      }])
      template = response.template
    }
    this.templateName = template as string
    let destination = flags.destination
    if (!destination) {
      let response: any = await inquirer.prompt([{
        name: 'destination',
        message: 'Path for the project',
        type: 'input',
        default: fspath.resolve(process.cwd() + '/' + project)
      }])
      destination = response.destination
    }
    this.destination = destination as string
    this.copyTemplates()
    this.play()
    this.copyProject()
  }

  private copyTemplates() {
    execSync(this.dockerBin + ' cp ' + this.templatesDir + ' ce_dev_controller:/home/ce-dev/')
  }
  private play() {
    let vars = '\'{"project_name":"' + this.projectName + '","project_type":"' + this.templateName + '"}\''
    execSync(this.dockerBin + ' exec -t --user ce-dev ce_dev_controller ansible-playbook /home/ce-dev/templates/create.yml --extra-vars=' + vars)
  }
  private copyProject() {
    fs.renameSync(fspath.join(this.config.cacheDir, this.projectName), this.destination)
  }
}
