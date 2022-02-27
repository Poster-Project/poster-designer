# Loads in an image and see if it failed to load
# If it did, it will purge the image from the files

import numpy as np
import cv2
import os, sys, shutil
import random, string


def random_string(length):
    pool = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    return ''.join(random.choices(pool, k=length))

def should_purge (img_np):

    # inset size 
    n = 100
    cuttoff = 210

    # Check if parts of the image are blank by its border
    top = img_np[n:(2*n),:]
    bottom = img_np[(-2*n):-n,:]
    left = img_np[:,n:(2*n)]
    right = img_np[:, (-2*n):-n]

    # Take averages
    top_avg = np.average(top)
    bottom_avg = np.average(bottom)
    left_avg = np.average(left)
    right_avg = np.average(right)

    any_big = top_avg > cuttoff or bottom_avg > cuttoff or left_avg > cuttoff or right_avg > cuttoff
    
    if any_big:
        return True
    else:
        return False


if __name__ == '__main__':

    # Get parameters passed into the script
    image_path = sys.argv[1]

    # Load in the image
    img = cv2.imread('../working-data/captures/' + image_path +'/raw.png')

    # If any are more than 210, purge the image
    if should_purge(img):
        print('Purging image: ' + image_path)
        # Move to trash dir
        shutil.move(
            '../working-data/captures/' + image_path + '/raw.png', 
            '../working-data/trash/' + image_path + '_' + random_string(20) + '.png'
        )
        # Delete the directory
        shutil.rmtree('../working-data/captures/' + image_path)
    else:
        print('Image is good: ' + image_path)
