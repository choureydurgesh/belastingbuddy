# =============================================================================
# Creates ONE small Ubuntu server on AWS, with a firewall, ready for Ansible.
#   terraform init     download providers
#   terraform plan     preview what WOULD change (safe)
#   terraform apply    really create it
#   terraform destroy  delete everything (so you don't pay)
# =============================================================================

# "data" = READ something that already exists (does not create anything)
data "aws_vpc" "default" {
  default = true
}

# Always pick the newest official Ubuntu 24.04 image (published by Canonical)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical's AWS account

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }
}

# SSH key so Ansible can log in
resource "aws_key_pair" "deployer" {
  key_name   = "belastingbuddy-deployer"
  public_key = var.ssh_public_key
}

# Firewall ("security group"). Only the ports we need are open.
resource "aws_security_group" "web" {
  name        = "belastingbuddy-web"
  description = "BelastingBuddy web + monitoring"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH (for Ansible)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr]
  }
  ingress {
    description = "The website"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "Grafana dashboards"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ssh_cidr] # only you, not the whole internet
  }
  # Outbound: only HTTP(S), for apt packages and pulling images from GHCR / Docker Hub.
  # It must be "any IP": registries and mirrors sit behind CDNs with changing addresses.
  # (DNS and time sync go to Amazon's own resolvers, which security groups don't filter.)
  # trivy:ignore:AWS-0104 reviewed: HTTPS/HTTP egress to CDNs can't be pinned to fixed IPs
  egress {
    description = "HTTPS out (container registries, pip)"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  # trivy:ignore:AWS-0104 reviewed: Ubuntu apt mirrors are served over HTTP (packages are GPG-signed)
  egress {
    description = "HTTP out (Ubuntu apt mirrors)"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# The server itself
resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.web.id]

  # Public on purpose: it serves the website and Ansible connects over SSH.
  # The security group above limits what is reachable (SSH and Grafana only from allowed_ssh_cidr).
  associate_public_ip_address = true

  root_block_device {
    volume_size = 20
    encrypted   = true # security best practice
  }

  metadata_options {
    http_tokens = "required" # enforce IMDSv2 (blocks a common credential-theft attack)
  }

  tags = {
    Name = "belastingbuddy"
  }
}

# TERRAFORM -> ANSIBLE HAND-OFF:
# Terraform knows the server's IP only after creating it, so it writes the Ansible inventory file for us.
resource "local_file" "ansible_inventory" {
  filename        = "${path.module}/../ansible/inventory.ini"
  file_permission = "0644"
  content         = <<-EOT
    [web]
    ${aws_instance.app.public_ip} ansible_user=ubuntu ansible_ssh_private_key_file=${var.ssh_private_key_path}
  EOT
}
