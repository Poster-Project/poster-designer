# Script to sync contents to aws
import boto3, json, re,inquirer, os, glob
from termcolor import colored

# Load keys.json
with open('keys.json') as f: keys = json.load(f)

client = boto3.client(
    's3',
    aws_access_key_id=keys['key'],
    aws_secret_access_key=keys['secret']
)

# Utils
def ask (message, options):
    chosen = (
        inquirer.prompt([
            inquirer.List('q',
                message=message,
                choices=options
            )
        ])
    )['q']
    return options.index(chosen)

def create_dir_if_not_exists ( path ):
    if not os.path.exists(path):
        os.makedirs(path)


def confirm (message):
    return ask(message, ['Yes', 'No']) == 0


# Quesitons

def get_root_question ():
    return ask(
        'What would you like to do?',
        ['Upload to S3', 'Download from S3', 'Generate File URLS', 'Quit']
    )

def upload_what ():
    return ask(
        'What files do you wish to upload',
        ['Upload Saved Positions', 'Upload Raw Pictures', 'Upload Exported Pictures', 'Quit']
    )

def download_what ():
    return ask(
        'What files do you wish to download',
        ['Download Saved Positions', 'Download Raw Pictures', 'Download Exported Pictures', 'Quit']
    )

def quit ():
    print(colored('Quitting...', 'red'))
    exit()

def upload_from_to ( local, remote, nested=False ):

    # Get all local folders        
    _files = glob.glob(local + ('/**/*.*' if nested else '/*.*'))
    paths_local = ['/'.join(f.split('/')[3:]) for f in _files]

    # Get all remote folders
    resp = client.list_objects(Bucket=keys['bucket'], Prefix=remote)
    paths_remote = []
    if 'Contents' in resp:
        for i in resp['Contents']:
            paths_remote.append('/'.join(i['Key'].split('/')[2:]))

    # Get all folders to upload
    paths_to_upload = []
    for i in paths_local:
        if i not in paths_remote:
            paths_to_upload.append(i)

    # Print results
    def list_examples (items):
        resp = []
        for i in items[:3]:
            resp.append(colored(i, 'blue'))
        return '( ' + ', '.join(resp) + ' ... )'

    print(colored('\nOperation Summary', 'magenta'))
    print("Uploading from: " + colored(local, 'blue') + " to: " + colored("S3:" + remote, 'blue'))
    print(colored('Local files:', 'green'), len(paths_local), list_examples(paths_local))
    print(colored('Remote files:', 'green'), len(paths_remote), list_examples(paths_remote))
    print(colored('Files to upload:', 'green'), len(paths_to_upload), list_examples(paths_to_upload))
    print('\n')

    if confirm('Is this correct'):
        print('\nUploading...')
        for i,p in enumerate(paths_to_upload):
            print(colored('Uploading', 'green'), p, f"{str(i+1)} of {str(len(paths_to_upload))}",' ' * 100, end='\r')
            client.upload_file(local  + '/' + p, keys['bucket'], remote + "/" + p)

        print(' '* 200)
        print(colored('Upload complete', 'green'), len(paths_to_upload), 'files uploaded')

    else:
        quit()

def download_from_to ( remote, local, nested=False ):

    # Get all local folders        
    _files = glob.glob(local + ('/**/*.*' if nested else '/*.*'))
    paths_local = ['/'.join(f.split('/')[3:]) for f in _files]

    # Get all remote folders
    resp = client.list_objects(Bucket=keys['bucket'], Prefix=remote)
    paths_remote = []
    if 'Contents' in resp:
        for i in resp['Contents']:
            paths_remote.append('/'.join(i['Key'].split('/')[2:]))

    # Get all folders to upload
    paths_to_download = []
    for i in paths_remote:
        if i not in paths_local:
            paths_to_download.append(i)

    # Print results
    def list_examples (items):
        resp = []
        for i in items[:3]:
            resp.append(colored(i, 'blue'))
        return '( ' + ', '.join(resp) + ' ... )'

    print(colored('\nOperation Summary', 'magenta'))
    print("Downloading from: " + colored("S3:" + remote, 'blue') + " to: " + colored(local, 'blue'))
    print(colored('Remote files:', 'green'), len(paths_remote), list_examples(paths_remote))
    print(colored('Local files:', 'green'), len(paths_local), list_examples(paths_local))
    print(colored('Files to download:', 'green'), len(paths_to_download), list_examples(paths_to_download))
    print('\n')

    if confirm('Is this correct'):
        print('\nDownloading...')
        for i,p in enumerate(paths_to_download):
            print(colored('Downloading', 'green'), p, f"{str(i+1)} of {str(len(paths_to_download))}",' ' * 100, end='\r')
            client.download_file(keys['bucket'], remote + "/" + p, local  + '/' + p )

        print(' '* 200)
        print(colored('Download complete', 'green'), len(paths_to_download), 'files gotten')

    else:
        quit()


# Main
_ = get_root_question()

create_dir_if_not_exists('./_local')
create_dir_if_not_exists('./_local/saved_positions')
create_dir_if_not_exists('./_local/raw_pictures')
create_dir_if_not_exists('./_local/exports')

# Upload
if _ == 0:

    _ = upload_what()

    # Upload saves
    if _ == 0:
        upload_from_to('./_local/saved_positions', '/saved_positions')

    # Upload raws
    if _ == 1:
        upload_from_to('./_local/raw_pictures', '/raw_pictures')

    # Upload finals
    if _ == 2:
        upload_from_to('./_local/exports/', '/exports', nested=True)

    if _ == 2:
        quit()

#Download
if _ == 1:

    _ = download_what()

    # Upload saves
    if _ == 0:
        download_from_to('/saved_positions', './_local/saved_positions')

    # Upload raws
    if _ == 1:
        download_from_to('/raw_pictures', './_local/raw_pictures')

    # Upload finals
    if _ == 2:
        download_from_to('/exports', './_local/exports/', nested=True)

    if _ == 2:
        quit()

# File URLS
if _ == 2:

    base_url = "https://poster-boi-data-dump.s3.amazonaws.com//exports/{file}/{style}-{type}.png"
    results = {}

    _files = glob.glob('./_local/saved_positions/*.*')
    for i in _files:

        with open(i) as f: _data = json.load(f)
        del _data['style']
        label = i.split('/')[-1].split('.')[0]
        _export_files = glob.glob('./_local/exports/' + label + '/*.*')

        results[label] = {
            "metadata" : _data,
            "styles" : {}
        }

        for f in _export_files:
            style = f.split('/')[-1].split('-')[0]
            results[label]['styles'][style] = {
                "full" : base_url.format(file=label, style=style, type='full'),
                "small" : base_url.format(file=label, style=style, type='small')
            }

        
    ## write results to file
    with open('./_local/index.json', 'w') as f:
        json.dump(results, f, indent=4)
    
    print(colored('\nSuccess', 'magenta'))