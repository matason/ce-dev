
import AnsibleCmd from '../base-cmd-ansible-abstract'

export default class DeployCmd extends AnsibleCmd {
  static description = 'Setup an app with Ansible playbooks.'
  static examples = [
    '$ ce-dev deploy example-app',
  ]

  protected ansibleProjectPlaybooksPath = '/home/ce-dev/projects-playbooks/deploy'
  protected ansibleScriptsPath = '/home/ce-dev/ansible-deploy'
  protected ansibleScript = 'scripts/deploy.sh'
  /**
   * @inheritdoc
   */
  public constructor(argv: string[], config: any) {
    super(argv, config)
    this.ansiblePaths = this.activeProjectInfo.deploy
  }
  protected getCommandParameters(ansiblePath: string): string {
    const workspace = this.ansibleProjectPlaybooksPath
    const repo = this.activeProjectInfo.project_name
    const cmd = '--workspace ' + workspace + ' --repo ' + repo + ' --branch ce-dev --playbook ' + ansiblePath + ' --build-number 1 --previous-stable-build-number 1 --ansible-extra-vars \'{"is_local":"yes"}\''
    return cmd
  }
}