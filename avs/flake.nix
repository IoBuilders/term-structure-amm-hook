{
  description = "ethereum project";
  inputs = {
    nixpkgs.url = "github:NixOs/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    foundry.url = "github:shazow/foundry.nix/monthly"; # Use monthly branch for permanent releases

  };
  outputs = { self, nixpkgs, flake-utils, foundry, ... }@inputs:
  flake-utils.lib.eachDefaultSystem (system:
  let
    pkgs = import nixpkgs {
      inherit system;
      overlays = [ foundry.overlay ];
    };

  in {

    overlays.default = final: prev: {};

    gitRev = if (builtins.hasAttr "rev" self) then self.rev else "dirty";

    devShells.default = pkgs.mkShell {
      buildInputs = with pkgs; [
        foundry-bin
        solc
        openssl
        pkg-config
        eza
        nodejs_20
        nodePackages.typescript
        nodePackages.typescript-language-server
        watchexec
      ];
    };
  });
}
