import os

def generate_llms_full():
    root_dir = r"d:\Github\superpipelines"
    output_file = os.path.join(root_dir, "llms-full.txt")
    
    core_files = ["README.md", "CLAUDE.md", "RELEASE-NOTES.md", "CHANGELOG.md"]
    
    with open(output_file, "w", encoding="utf-8") as outfile:
        # Header
        outfile.write("# Superpipelines — Full Documentation Suite\n\n")
        
        # Core files
        for filename in core_files:
            filepath = os.path.join(root_dir, filename)
            if os.path.exists(filepath):
                outfile.write(f"# File: {filename}\n")
                outfile.write("-" * 40 + "\n")
                with open(filepath, "r", encoding="utf-8") as f:
                    outfile.write(f.read())
                outfile.write("\n\n")
        
        # Skills
        skills_dir = os.path.join(root_dir, "skills")
        for root, dirs, files in os.walk(skills_dir):
            for file in files:
                if file.endswith(".md"):
                    filepath = os.path.join(root, file)
                    rel_path = os.path.relpath(filepath, root_dir)
                    
                    # Skip internal/temp files if any
                    if "CREATION-LOG.md" in file or "test-pressure" in file or "test-academic" in file:
                        continue
                        
                    outfile.write(f"# File: {rel_path}\n")
                    outfile.write("-" * 40 + "\n")
                    with open(filepath, "r", encoding="utf-8") as f:
                        outfile.write(f.read())
                    outfile.write("\n\n")

if __name__ == "__main__":
    generate_llms_full()
