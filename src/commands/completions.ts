import type { Command } from "commander";

const SUBCOMMANDS = [
  "init", "uninstall", "review", "run", "config", "log", "test",
  "update", "integrate", "scan", "fix", "stats", "rules", "doctor",
  "rage", "hook", "completions",
];

const GLOBAL_FLAGS = ["--help", "--version", "--no-color"];

function bashScript(): string {
  return `# dgent bash completion
# Add to ~/.bashrc: eval "$(dgent completions bash)"
_dgent_completions() {
  local cur prev commands
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  commands="${SUBCOMMANDS.join(" ")}"

  case "\${prev}" in
    dgent)
      COMPREPLY=( $(compgen -W "\${commands} ${GLOBAL_FLAGS.join(" ")}" -- "\${cur}") )
      return 0
      ;;
    scan)
      COMPREPLY=( $(compgen -W "--fix --json --dry-run" -- "\${cur}") )
      return 0
      ;;
    config)
      COMPREPLY=( $(compgen -W "get set list" -- "\${cur}") )
      return 0
      ;;
    review)
      COMPREPLY=( $(compgen -W "--json --verbose" -- "\${cur}") )
      return 0
      ;;
    completions)
      COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
      return 0
      ;;
    init)
      COMPREPLY=( $(compgen -W "--force" -- "\${cur}") )
      return 0
      ;;
  esac

  if [[ "\${cur}" == -* ]]; then
    COMPREPLY=( $(compgen -W "${GLOBAL_FLAGS.join(" ")}" -- "\${cur}") )
    return 0
  fi

  COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
}
complete -F _dgent_completions dgent
`;
}

function zshScript(): string {
  return `# dgent zsh completion
# Add to ~/.zshrc: eval "$(dgent completions zsh)"
_dgent() {
  local -a commands
  commands=(
${SUBCOMMANDS.map((c) => `    '${c}:${c} command'`).join("\n")}
  )

  _arguments -C \\
    '(-h --help)'{-h,--help}'[Show help]' \\
    '(-V --version)'{-V,--version}'[Show version]' \\
    '--no-color[Disable color output]' \\
    '1:command:->cmd' \\
    '*::arg:->args'

  case "\$state" in
    cmd)
      _describe -t commands 'dgent commands' commands
      ;;
    args)
      case "\$words[1]" in
        scan)
          _arguments \\
            '--fix[Apply fixes in place]' \\
            '--json[Output results as JSON]' \\
            '--dry-run[Show what fix would change]'
          ;;
        config)
          local -a subcommands
          subcommands=('get:Get a config value' 'set:Set a config value' 'list:List all config')
          _describe -t subcommands 'config subcommands' subcommands
          ;;
        completions)
          local -a shells
          shells=('bash:Bash completion' 'zsh:Zsh completion' 'fish:Fish completion')
          _describe -t shells 'shell' shells
          ;;
        init)
          _arguments '--force[Force re-initialization]'
          ;;
      esac
      ;;
  esac
}
compdef _dgent dgent
`;
}

function fishScript(): string {
  return `# dgent fish completion
# Add to ~/.config/fish/completions/dgent.fish
# Or run: dgent completions fish > ~/.config/fish/completions/dgent.fish

# Disable file completions by default
complete -c dgent -f

# Subcommands
${SUBCOMMANDS.map((c) => `complete -c dgent -n '__fish_use_subcommand' -a '${c}' -d '${c} command'`).join("\n")}

# Global flags
complete -c dgent -n '__fish_use_subcommand' -l help -d 'Show help'
complete -c dgent -n '__fish_use_subcommand' -l version -d 'Show version'
complete -c dgent -n '__fish_use_subcommand' -l no-color -d 'Disable color output'

# scan flags
complete -c dgent -n '__fish_seen_subcommand_from scan' -l fix -d 'Apply fixes in place'
complete -c dgent -n '__fish_seen_subcommand_from scan' -l json -d 'Output results as JSON'
complete -c dgent -n '__fish_seen_subcommand_from scan' -l dry-run -d 'Show what fix would change'

# config subcommands
complete -c dgent -n '__fish_seen_subcommand_from config' -a 'get set list' -d 'Config operation'

# completions shells
complete -c dgent -n '__fish_seen_subcommand_from completions' -a 'bash zsh fish' -d 'Shell type'

# init flags
complete -c dgent -n '__fish_seen_subcommand_from init' -l force -d 'Force re-initialization'
`;
}

export function registerCompletions(program: Command): void {
  const cmd = program
    .command("completions <shell>")
    .description("Output shell completion script (bash, zsh, fish)")
    .action((shell: string) => {
      switch (shell) {
        case "bash":
          process.stdout.write(bashScript());
          break;
        case "zsh":
          process.stdout.write(zshScript());
          break;
        case "fish":
          process.stdout.write(fishScript());
          break;
        default:
          console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
          process.exit(1);
      }
    });
}
