terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
  
  backend "gcs" {
    bucket = "modmaster-terraform-state"
    prefix = "production"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "modmaster-prod"
  location = var.zone
  
  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1
  
  # Network configuration
  network    = google_compute_network.vpc.name
  subnetwork = google_compute_subnetwork.subnet.name
  
  # Security
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }
  
  # Cluster configuration
  cluster_autoscaling {
    enabled = true
    resource_limits {
      resource_type = "cpu"
      minimum       = 10
      maximum       = 100
    }
    resource_limits {
      resource_type = "memory"
      minimum       = 40
      maximum       = 400
    }
  }
  
  # Addons
  addons_config {
    horizontal_pod_autoscaling {
      disabled = false
    }
    http_load_balancing {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
  }
  
  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }
  
  # Release channel
  release_channel {
    channel = "STABLE"
  }
  
  # Monitoring and logging
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus {
      enabled = true
    }
  }
  
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }
}

# Node Pool for general workloads
resource "google_container_node_pool" "primary_nodes" {
  name       = "general-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = 3
  
  autoscaling {
    min_node_count = 3
    max_node_count = 10
  }
  
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  
  node_config {
    preemptible  = false
    machine_type = "n2-standard-4"
    
    disk_size_gb = 100
    disk_type    = "pd-ssd"
    
    labels = {
      env  = "production"
      pool = "general"
    }
    
    service_account = google_service_account.kubernetes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# Node Pool for GPU workloads (AI Service)
resource "google_container_node_pool" "gpu_nodes" {
  name       = "gpu-pool"
  location   = var.zone
  cluster    = google_container_cluster.primary.name
  node_count = 1
  
  autoscaling {
    min_node_count = 1
    max_node_count = 4
  }
  
  management {
    auto_repair  = true
    auto_upgrade = true
  }
  
  node_config {
    preemptible  = true  # Use preemptible for cost savings
    machine_type = "n1-standard-4"
    
    guest_accelerator {
      type  = "nvidia-tesla-t4"
      count = 1
    }
    
    disk_size_gb = 200
    disk_type    = "pd-ssd"
    
    labels = {
      env          = "production"
      pool         = "gpu"
      accelerator  = "nvidia-tesla-t4"
    }
    
    taint {
      key    = "nvidia.com/gpu"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
    
    service_account = google_service_account.kubernetes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]
    
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# VPC
resource "google_compute_network" "vpc" {
  name                    = "modmaster-vpc"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "subnet" {
  name          = "modmaster-subnet"
  ip_cidr_range = "10.0.0.0/16"
  region        = var.region
  network       = google_compute_network.vpc.id
  
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }
  
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/16"
  }
}

# Service Account for Kubernetes nodes
resource "google_service_account" "kubernetes" {
  account_id   = "kubernetes-nodes"
  display_name = "Kubernetes Node Service Account"
}

# Cloud SQL for PostgreSQL
resource "google_sql_database_instance" "postgres" {
  name             = "modmaster-postgres-prod"
  database_version = "POSTGRES_14"
  region           = var.region
  
  settings {
    tier = "db-custom-4-16384"
    
    disk_size         = 100
    disk_type         = "PD_SSD"
    disk_autoresize   = true
    
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }
    
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }
    
    database_flags {
      name  = "max_connections"
      value = "200"
    }
    
    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }
  
  deletion_protection = true
}

# Cloud SQL Database
resource "google_sql_database" "database" {
  name     = "modmaster_prod"
  instance = google_sql_database_instance.postgres.name
}

# Cloud SQL User
resource "google_sql_user" "users" {
  name     = "modmaster_prod"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# Redis Memorystore
resource "google_redis_instance" "cache" {
  name           = "modmaster-redis-prod"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  region         = var.region
  
  redis_version     = "REDIS_7_0"
  display_name      = "ModMaster Redis Cache"
  
  authorized_network = google_compute_network.vpc.id
  
  persistence_config {
    persistence_mode    = "RDB"
    rdb_snapshot_period = "ONE_HOUR"
  }
  
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }
}

# Cloud Storage Buckets
resource "google_storage_bucket" "media" {
  name          = "${var.project_id}-media-prod"
  location      = var.region
  storage_class = "STANDARD"
  
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }
  
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90
    }
  }
  
  cors {
    origin          = ["https://app.modmasterpro.com", "https://admin.modmasterpro.com"]
    method          = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  versioning {
    enabled = true
  }
  
  uniform_bucket_level_access = true
}

resource "google_storage_bucket" "backups" {
  name          = "${var.project_id}-backups-prod"
  location      = var.region
  storage_class = "NEARLINE"
  
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 90
    }
  }
  
  versioning {
    enabled = true
  }
  
  uniform_bucket_level_access = true
}

# Cloud Load Balancer
resource "google_compute_global_address" "default" {
  name = "modmaster-ip"
}

# Firewall rules
resource "google_compute_firewall" "allow_health_checks" {
  name    = "allow-health-checks"
  network = google_compute_network.vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
  
  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["gke-node"]
}

# Output values
output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "postgres_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "redis_port" {
  value = google_redis_instance.cache.port
}

output "load_balancer_ip" {
  value = google_compute_global_address.default.address
}